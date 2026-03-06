-- Per-user dubbing history tables for analytics and history pages.
-- Run in Supabase SQL editor.

create table if not exists public.dubbing_jobs (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade,

  status text not null check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  progress text,
  error_message text,

  input_type text check (input_type in ('url', 'file')),
  input_label text,
  source_language text,
  target_language text,
  translation_provider text,
  voice_mode text,
  accent text,

  output_path text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_dubbing_jobs_user_created
  on public.dubbing_jobs (user_id, created_at desc);

create index if not exists idx_dubbing_jobs_user_status
  on public.dubbing_jobs (user_id, status);

create table if not exists public.dubbing_segments (
  id bigserial primary key,
  job_id text not null references public.dubbing_jobs(id) on delete cascade,
  segment_index integer not null,
  start_sec numeric not null default 0,
  end_sec numeric not null default 0,
  source_text text,
  translated_text text,
  gesture text,
  created_at timestamptz not null default now(),
  unique (job_id, segment_index)
);

create index if not exists idx_dubbing_segments_job
  on public.dubbing_segments (job_id, segment_index);
