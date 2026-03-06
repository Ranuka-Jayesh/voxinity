-- Add profile overview fields to raw-table auth users table.
-- Run this once in Supabase SQL editor.

alter table public.users
  add column if not exists location text,
  add column if not exists preferred_language text,
  add column if not exists bio text,
  add column if not exists active_languages integer default 0,
  add column if not exists plan_name text,
  add column if not exists next_billing_text text,
  add column if not exists member_since_text text,
  add column if not exists membership_duration_text text,
  add column if not exists updated_at timestamptz default now();

-- Optional seed defaults for existing rows
update public.users
set
  preferred_language = coalesce(preferred_language, 'English'),
  active_languages = coalesce(active_languages, 7),
  plan_name = coalesce(plan_name, 'Pro'),
  next_billing_text = coalesce(next_billing_text, 'Next billing: Feb 28'),
  member_since_text = coalesce(member_since_text, 'Jan 2024'),
  membership_duration_text = coalesce(membership_duration_text, '14 months active'),
  updated_at = now()
where true;
