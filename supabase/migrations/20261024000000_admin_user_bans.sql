-- Add ban controls to existing Joes Studio profiles.
-- Apply this migration to the Supabase project used by the deployed app.
alter table public.profiles
  add column if not exists is_banned boolean not null default false;
alter table public.profiles
  add column if not exists ban_reason text;
notify pgrst, 'reload schema';
