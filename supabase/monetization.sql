-- Run in the Supabase SQL Editor for Joes Studio Development.
create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade,email text not null,phone text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,plan text not null default 'free' check(plan in ('free','daily','weekly','monthly')),status text not null default 'active' check(status in ('active','expired','pending','cancelled')),starts_at timestamptz,expires_at timestamptz,custom_templates_enabled boolean not null default false,custom_watermark_enabled boolean not null default false,updated_at timestamptz not null default now());
create table if not exists public.payment_requests (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,email text not null,phone text,plan text not null check(plan in ('daily','weekly','monthly')),amount_ugx integer not null check(amount_ugx>0),payment_reference text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),requested_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by uuid references auth.users(id),admin_note text);
create table if not exists public.monthly_usage (user_id uuid not null references auth.users(id) on delete cascade,month_key date not null,batch_actions integer not null default 0 check(batch_actions>=0),updated_at timestamptz not null default now(),primary key(user_id,month_key));
alter table public.profiles enable row level security; alter table public.subscriptions enable row level security; alter table public.payment_requests enable row level security; alter table public.monthly_usage enable row level security;
revoke all on public.profiles,public.subscriptions,public.payment_requests,public.monthly_usage from anon,authenticated;
create or replace function public.consume_batch_action(p_user_id uuid,p_enforce_limit boolean default true) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_month date := date_trunc('month',now() at time zone 'UTC')::date; v_count integer;
begin
 insert into public.monthly_usage(user_id,month_key,batch_actions) values(p_user_id,v_month,0) on conflict(user_id,month_key) do nothing;
 select batch_actions into v_count from public.monthly_usage where user_id=p_user_id and month_key=v_month for update;
 if p_enforce_limit and v_count>=2 then return jsonb_build_object('allowed',false,'batch_actions',v_count,'month_key',v_month); end if;
 update public.monthly_usage set batch_actions=batch_actions+1,updated_at=now() where user_id=p_user_id and month_key=v_month returning batch_actions into v_count;
 return jsonb_build_object('allowed',true,'batch_actions',v_count,'month_key',v_month);
end; $$;
revoke all on function public.consume_batch_action(uuid,boolean) from public,anon,authenticated; grant execute on function public.consume_batch_action(uuid,boolean) to service_role;
