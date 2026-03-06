-- Separate admin auth tables (independent from public.users/user_sessions)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  role text not null default 'super_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_users_email on public.admin_users (email);
create index if not exists idx_admin_users_active on public.admin_users (is_active);

create table if not exists public.admin_sessions (
  id bigserial primary key,
  admin_id uuid not null references public.admin_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_admin on public.admin_sessions (admin_id);
create index if not exists idx_admin_sessions_expiry on public.admin_sessions (expires_at);

-- Seed default admin credential:
-- email: admin@gmail.com
-- password: admin123
insert into public.admin_users (
  email,
  password_hash,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
values (
  'admin@gmail.com',
  'pbkdf2_sha256$200000$dm94aW5pdHktYWRtaW4tc2FsdA==$l7F8N5C3Sao9T0grgek2ZFZR1ord4TPOoeLaNyl7eS8=',
  'Admin User',
  'super_admin',
  true,
  now(),
  now()
)
on conflict (email) do update set
  password_hash = excluded.password_hash,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
