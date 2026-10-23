-- Joes Studio monetization schema.
-- Additive migration: creates only the tables/functions used by api/_lib.js and api/billing.js.
-- This file is not applied automatically by Vercel; review and apply to the intended Supabase project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_uidx
  on public.profiles (lower(email));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'daily', 'weekly', 'monthly')),
  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz,
  expires_at timestamptz,
  custom_templates_enabled boolean not null default false,
  custom_watermark_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_status_expires_idx
  on public.subscriptions (status, expires_at);

create table if not exists public.monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key date not null,
  batch_actions integer not null default 0 check (batch_actions >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  plan text not null check (plan in ('daily', 'weekly', 'monthly')),
  amount_ugx numeric(14,2) not null check (amount_ugx > 0),
  payment_reference text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  admin_note text
);

create index if not exists payment_requests_status_requested_idx
  on public.payment_requests (status, requested_at desc);
create index if not exists payment_requests_user_status_idx
  on public.payment_requests (user_id, status);

-- Called by the server with the service-role key. The row lock/upsert makes the monthly
-- free-action limit atomic when multiple requests arrive at once.
create or replace function public.consume_batch_action(
  p_user_id uuid,
  p_enforce_limit boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month_key date := date_trunc('month', now() at time zone 'UTC')::date;
  v_actions integer;
begin
  insert into public.monthly_usage (user_id, month_key, batch_actions, updated_at)
  values (p_user_id, v_month_key, 1, now())
  on conflict (user_id, month_key) do update
    set batch_actions = public.monthly_usage.batch_actions + 1,
        updated_at = now()
    where not p_enforce_limit or public.monthly_usage.batch_actions < 2
  returning batch_actions into v_actions;

  if v_actions is null then
    select batch_actions into v_actions
      from public.monthly_usage
      where user_id = p_user_id and month_key = v_month_key;
    return jsonb_build_object(
      'allowed', false,
      'month_key', v_month_key,
      'batch_actions', coalesce(v_actions, 0)
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'month_key', v_month_key,
    'batch_actions', v_actions
  );
end;
$$;

-- These tables are accessed by the server using the Supabase service-role key.
-- Enable RLS so browser/anon clients cannot read or write billing/profile data directly.
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.monthly_usage enable row level security;
alter table public.payment_requests enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.monthly_usage from anon, authenticated;
revoke all on public.payment_requests from anon, authenticated;

-- Do not grant direct RPC execution to browser roles. The server uses service_role.
revoke all on function public.consume_batch_action(uuid, boolean) from public, anon, authenticated;
grant execute on function public.consume_batch_action(uuid, boolean) to service_role;

notify pgrst, 'reload schema';
