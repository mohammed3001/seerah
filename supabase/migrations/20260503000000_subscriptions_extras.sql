-- =============================================================================
-- 20260503000000_subscriptions_extras.sql
-- Phase 5 — subscription system: extra columns + referral stub.
-- Idempotent. Forward-only.
-- =============================================================================

-- ---------- profiles -------------------------------------------------------
alter table public.profiles
  add column if not exists billing_country text,
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

comment on column public.profiles.billing_country is
  'ISO 3166-1 alpha-2 country code derived at signup or first checkout. Used to pick Stripe vs Paddle.';
comment on column public.profiles.referral_code is
  'Public referral slug (Phase 5 stub — UI deferred).';

create index if not exists profiles_referral_code_idx on public.profiles (referral_code);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- Backfill referral codes for existing rows so the column has values.
update public.profiles
   set referral_code = lower(substr(replace(id::text, '-', ''), 1, 10))
 where referral_code is null;

-- ---------- subscriptions: track full Stripe lifecycle ---------------------
alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists provider text not null default 'stripe' check (provider in ('stripe', 'paddle')),
  add column if not exists trial_end timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists currency text,
  add column if not exists last_event_id text;

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

-- The webhook handler de-duplicates by event id; ensure the column is unique
-- where present (NULLs allowed for older rows).
create unique index if not exists subscriptions_last_event_id_uidx
  on public.subscriptions (last_event_id) where last_event_id is not null;

-- ---------- resumes: feature flags --------------------------------------------
-- password_hash already exists from the resumes migration; nothing to add here.
-- Custom sections live in their own jsonb column on resumes for prime users.
alter table public.resumes
  add column if not exists custom_sections jsonb not null default '[]'::jsonb;

comment on column public.resumes.custom_sections is
  'Prime-only — array of {key,label_ar,label_en,items[]}. Free users cannot create.';

-- ---------- referral_redemptions stub ----------------------------------------
create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  reward_amount_cents int,
  reward_currency text,
  redeemed_at timestamptz not null default now(),
  unique (referrer_id, referee_id)
);

create index if not exists referral_redemptions_referrer_idx
  on public.referral_redemptions (referrer_id);

alter table public.referral_redemptions enable row level security;

-- Policies: a user can read their own redemptions; nothing else for now.
drop policy if exists "referral redemptions self read" on public.referral_redemptions;
create policy "referral redemptions self read"
  on public.referral_redemptions
  for select
  using (auth.uid() in (referrer_id, referee_id));

-- ---------- helper: keep profiles.plan in sync with subscriptions ------------
-- A trigger so the editor's plan check (the source of truth for free/prime
-- gating in the UI) reflects what Stripe says even if a webhook re-runs.
create or replace function public.sync_profile_plan_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('active', 'trialing', 'past_due') then
    -- past_due means a renewal payment failed but Stripe is still retrying
    -- (typically for ~3 weeks). The user's access must be preserved during
    -- this grace period; the UI shows a warning banner instead. Only true
    -- terminal states downgrade the plan.
    update public.profiles
       set plan = 'prime',
           plan_expires_at = new.current_period_end,
           max_resumes = greatest(coalesce(max_resumes, 1), 5)
     where id = new.user_id;
  elsif new.status in ('canceled', 'incomplete_expired', 'unpaid') then
    -- Only downgrade if the most recent subscription says so.
    update public.profiles p
       set plan = 'free',
           plan_expires_at = null,
           max_resumes = 1
     where p.id = new.user_id
       and not exists (
         select 1
           from public.subscriptions s
          where s.user_id = p.id
            and s.status in ('active', 'trialing', 'past_due')
            and (s.id <> new.id)
       );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_plan on public.subscriptions;
create trigger trg_sync_profile_plan
  after insert or update of status, current_period_end on public.subscriptions
  for each row execute function public.sync_profile_plan_from_subscription();
