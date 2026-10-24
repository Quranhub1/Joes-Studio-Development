-- Run after supabase/monetization.sql in the Supabase SQL Editor.
-- Existing daily/weekly/monthly subscribers are migrated to Pro so their current
-- expiry timestamps remain intact. Review historical payment descriptions as needed.
-- Ensure the composite conflict target used by the usage RPC exists in older deployments.
create unique index if not exists monthly_usage_user_month_unique on public.monthly_usage(user_id,month_key);
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
update public.subscriptions set plan='pro' where plan in ('daily','weekly','monthly');
alter table public.subscriptions add constraint subscriptions_plan_check check(plan in ('free','pro','business','institution'));

alter table public.payment_requests drop constraint if exists payment_requests_plan_check;
update public.payment_requests set plan='pro' where plan in ('daily','weekly','monthly');
alter table public.payment_requests add constraint payment_requests_plan_check check(plan in ('pro','business','institution'));

create table if not exists public.credit_wallet (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check(credits>=0),
  updated_at timestamptz not null default now()
);
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check(delta<>0),
  reason text not null check(reason in ('purchase','batch_action','admin_adjustment')),
  reference text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  credits integer not null check(credits>0),
  amount_ugx integer not null check(amount_ugx>0),
  payment_reference text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  admin_note text
);
create unique index if not exists credit_requests_payment_reference_unique on public.credit_requests(lower(payment_reference));
create table if not exists public.commercial_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  kind text not null check(kind in ('institution','marketplace','service')),
  subject text not null,
  details text not null,
  contact text not null,
  status text not null default 'pending' check(status in ('pending','reviewing','contacted','closed','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  admin_note text
);
alter table public.credit_wallet enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_requests enable row level security;
alter table public.commercial_requests enable row level security;
revoke all on public.credit_wallet,public.credit_ledger,public.credit_requests,public.commercial_requests from anon,authenticated;

create or replace function public.consume_batch_action(p_user_id uuid,p_enforce_limit boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_month date := date_trunc('month',now() at time zone 'UTC')::date;
  v_count integer;
  v_credits integer;
begin
  insert into public.monthly_usage(user_id,month_key,batch_actions)
  values(p_user_id,v_month,0) on conflict(user_id,month_key) do nothing;
  select batch_actions into v_count from public.monthly_usage
  where user_id=p_user_id and month_key=v_month for update;
  if not p_enforce_limit then
    update public.monthly_usage set batch_actions=batch_actions+1,updated_at=now()
    where user_id=p_user_id and month_key=v_month returning batch_actions into v_count;
    return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','subscription');
  end if;
  if v_count<2 then
    update public.monthly_usage set batch_actions=batch_actions+1,updated_at=now()
    where user_id=p_user_id and month_key=v_month returning batch_actions into v_count;
    return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','free');
  end if;
  insert into public.credit_wallet(user_id,credits) values(p_user_id,0) on conflict(user_id) do nothing;
  select credits into v_credits from public.credit_wallet where user_id=p_user_id for update;
  if coalesce(v_credits,0)<=0 then
    return jsonb_build_object('allowed',false,'batch_actions',v_count,'month_key',v_month,'credits',0);
  end if;
  update public.credit_wallet set credits=credits-1,updated_at=now()
  where user_id=p_user_id returning credits into v_credits;
  insert into public.credit_ledger(user_id,delta,reason) values(p_user_id,-1,'batch_action');
  return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month,'source','credit','credits',v_credits);
end; $$;
revoke all on function public.consume_batch_action(uuid,boolean) from public,anon,authenticated;
grant execute on function public.consume_batch_action(uuid,boolean) to service_role;

create or replace function public.grant_credits(p_user_id uuid,p_credits integer,p_reference text,p_admin_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_credits integer; v_inserted integer;
begin
  if p_credits<=0 or length(coalesce(p_reference,''))=0 then
    raise exception 'Invalid credit grant';
  end if;
  insert into public.credit_ledger(user_id,delta,reason,reference)
  values(p_user_id,p_credits,'purchase',p_reference)
  on conflict(reference) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    select credits into v_credits from public.credit_wallet where user_id=p_user_id;
    return jsonb_build_object('ok',true,'duplicate',true,'credits',coalesce(v_credits,0));
  end if;
  insert into public.credit_wallet(user_id,credits) values(p_user_id,p_credits)
  on conflict(user_id) do update set credits=public.credit_wallet.credits+excluded.credits,updated_at=now()
  returning credits into v_credits;
  return jsonb_build_object('ok',true,'duplicate',false,'credits',v_credits);
end; $$;
revoke all on function public.grant_credits(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.grant_credits(uuid,integer,text,uuid) to service_role;
