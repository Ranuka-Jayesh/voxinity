-- Admin audit logs table
-- Run once in Supabase SQL editor.

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  admin_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_admin on public.admin_audit_logs (admin_id, created_at desc);
create index if not exists idx_admin_audit_logs_action on public.admin_audit_logs (action, created_at desc);
