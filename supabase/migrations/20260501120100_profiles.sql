-- =============================================================================
-- 20260501120100_profiles.sql
-- Profile table (extends auth.users).
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'prime', 'enterprise')),
  plan_expires_at timestamptz,
  stripe_customer_id text unique,
  max_resumes int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing user profile, one row per auth.users row.';
comment on column public.profiles.plan is 'Subscription tier: free, prime, enterprise.';
comment on column public.profiles.max_resumes is 'Plan-derived cap on number of resumes per user.';

create index if not exists profiles_plan_idx on public.profiles (plan);
create index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);
