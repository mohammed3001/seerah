-- =============================================================================
-- 20260501120400_billing_support_analytics.sql
-- Templates, subscriptions, support tickets, AI usage, and view tracking.
-- =============================================================================

-- ---------- Templates --------------------------------------------------------
create table if not exists public.templates (
  id text primary key,
  name text not null,
  name_ar text,
  preview_url text,
  thumbnail_url text,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  category text not null default 'modern',
  tags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists templates_category_idx on public.templates (category) where is_active;
create index if not exists templates_sort_order_idx on public.templates (sort_order) where is_active;

-- ---------- Subscriptions (Stripe webhook source of truth) -------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ---------- Support tickets --------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  message text not null,
  attachment_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

-- ---------- AI usage tracking ------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  action_type text,
  tokens_used int,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_id_idx on public.ai_usage (user_id);
create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);

-- ---------- Resume views (analytics) ----------------------------------------
create table if not exists public.resume_views (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  viewer_ip text,
  referrer text,
  user_agent text,
  viewed_at timestamptz not null default now()
);

create index if not exists resume_views_resume_id_viewed_idx on public.resume_views (resume_id, viewed_at desc);
