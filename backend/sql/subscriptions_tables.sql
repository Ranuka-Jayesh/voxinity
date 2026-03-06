-- Subscription and checkout persistence tables.
-- Run this once in Supabase SQL editor.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('hobby','pro','business')),
  status text not null check (status in ('trialing','active','past_due','canceled','expired')),
  billing_interval text not null default 'month' check (billing_interval in ('month','year')),
  price_usd numeric(10,2) not null default 0,
  currency text not null default 'USD',
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  payment_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id, created_at desc);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  invoice_number text not null unique,
  amount_subtotal numeric(10,2) not null,
  amount_tax numeric(10,2) not null default 0,
  amount_total numeric(10,2) not null,
  currency text not null default 'USD',
  period_start timestamptz not null,
  period_end timestamptz not null,
  due_at timestamptz,
  paid_at timestamptz,
  status text not null check (status in ('draft','open','paid','void','uncollectible')),
  hosted_invoice_url text,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_user on public.subscription_invoices(user_id, created_at desc);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.subscription_invoices(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  provider text,
  provider_payment_intent_id text,
  provider_charge_id text,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.subscription_payments(user_id, created_at desc);

notify pgrst, 'reload schema';
