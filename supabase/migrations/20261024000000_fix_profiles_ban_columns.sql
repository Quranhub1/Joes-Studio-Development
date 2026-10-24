-- Repair the profile moderation columns expected by api/_lib.js and api/billing.js.
-- Safe to run repeatedly against the Joes Studio Supabase project.
alter table public.profiles
  add column if not exists is_banned boolean not null default false;

alter table public.profiles
  add column if not exists ban_reason text;

notify pgrst, 'reload schema';
