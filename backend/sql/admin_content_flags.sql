-- LEGACY: separate moderation table. The app now uses columns on public.dubbing_jobs instead.
-- Prefer: backend/sql/dubbing_jobs_moderation_columns.sql
--
-- Admin moderation flags for content/jobs (required for Flag / Unflag in Admin → Content).
--
-- Run in Supabase: Dashboard → SQL → New query → paste → Run.
--
-- Prerequisites (run these first if you have not already):
--   1. backend/sql/dubbing_tables.sql        → public.dubbing_jobs
--   2. backend/sql/admin_auth_tables.sql     → public.admin_users (FK on updated_by_admin_id)

create table if not exists public.admin_content_flags (
  id bigserial primary key,
  job_id text not null references public.dubbing_jobs(id) on delete cascade,
  is_flagged boolean not null default true,
  reason text,
  updated_by_admin_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id)
);

create index if not exists idx_admin_content_flags_job on public.admin_content_flags (job_id);
create index if not exists idx_admin_content_flags_flagged on public.admin_content_flags (is_flagged);
