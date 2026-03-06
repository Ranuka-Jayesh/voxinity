-- Admin notifications + user delivery/read/click tracking.
-- Run once in Supabase SQL editor.

create table if not exists public.admin_notifications (
  id bigserial primary key,
  title text not null,
  body text not null,
  audience text not null default 'all',
  audience_payload text,
  created_by_admin_id uuid references public.admin_users(id) on delete set null,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notifications_created
  on public.admin_notifications (created_at desc);

create table if not exists public.user_notifications (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  admin_notification_id bigint references public.admin_notifications(id) on delete set null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);
create index if not exists idx_user_notifications_read
  on public.user_notifications (is_read, created_at desc);

create table if not exists public.notification_delivery_logs (
  id bigserial primary key,
  admin_notification_id bigint not null references public.admin_notifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  delivery_status text not null default 'delivered',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_delivery_logs_notification
  on public.notification_delivery_logs (admin_notification_id, created_at desc);

create table if not exists public.notification_click_events (
  id bigserial primary key,
  user_notification_id bigint not null references public.user_notifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  target text,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_notification_click_events_user_notification
  on public.notification_click_events (user_notification_id);
