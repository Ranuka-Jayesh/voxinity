-- Ensure new users get Hobby plan by default.
-- Run this once in Supabase SQL editor.

alter table public.users
  add column if not exists plan_name text;

alter table public.users
  alter column plan_name set default 'Hobby';

-- Optional backfill for existing users without a plan.
update public.users
set plan_name = 'Hobby'
where plan_name is null or btrim(plan_name) = '';

notify pgrst, 'reload schema';
