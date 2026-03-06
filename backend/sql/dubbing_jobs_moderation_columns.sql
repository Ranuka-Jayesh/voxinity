-- Moderation flags stored on dubbing_jobs (Admin → Content flag / unflag).
--
-- Run after:
--   backend/sql/dubbing_tables.sql
--   backend/sql/admin_auth_tables.sql   (FK on flagged_by_admin_id)

alter table public.dubbing_jobs
  add column if not exists is_flagged boolean not null default false;

alter table public.dubbing_jobs
  add column if not exists flag_reason text;

alter table public.dubbing_jobs
  add column if not exists flagged_at timestamptz;

alter table public.dubbing_jobs
  add column if not exists flagged_by_admin_id uuid references public.admin_users (id) on delete set null;

create index if not exists idx_dubbing_jobs_flagged on public.dubbing_jobs (is_flagged)
  where is_flagged = true;
