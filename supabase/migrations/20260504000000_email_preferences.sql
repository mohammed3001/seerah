-- =============================================================================
-- 20260504000000_email_preferences.sql
-- Adds the columns needed by PR-B (transactional emails via Resend):
--   - profiles.marketing_emails_enabled — controls non-essential mail
--     (welcome, expiring soon). Transactional mail (receipt, payment failed,
--     cancellation, support) ignores this flag because suppressing those is
--     not legal under CAN-SPAM and most other transactional-email regulations.
--   - profiles.unsubscribe_token — random uuid surfaced as ?token=... on the
--     unsubscribe link so users can opt out without logging in.
--   - profiles.locale — used to pick the email template language. Defaults to
--     'ar'; we'll add 'en' rendering later but the column needs to exist now.
--   - email_log table — durable audit of every transactional message we
--     attempt to send, plus the Resend message id so support can correlate
--     "did this user receive their receipt?" without reading provider logs.
-- =============================================================================

-- ---------- profiles columns ------------------------------------------------

alter table public.profiles
  add column if not exists marketing_emails_enabled boolean not null default true,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists locale text not null default 'ar' check (locale in ('ar', 'en'));

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

comment on column public.profiles.marketing_emails_enabled is
  'When false, suppresses non-transactional mail (welcome, expiring-soon). Transactional receipts ignore this flag.';
comment on column public.profiles.unsubscribe_token is
  'Random token used by /api/email/unsubscribe so users can opt out without an authenticated session.';
comment on column public.profiles.locale is
  'Preferred language for emails and UI. Currently ar | en.';

-- ---------- email_log -------------------------------------------------------

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  to_email text not null,
  template text not null,
  -- Resend's message id (e.g. "abc123..."). null while the request is in
  -- flight or if the provider call failed before returning an id.
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.email_log is
  'Durable audit of every transactional email we tried to deliver. One row per send attempt.';
comment on column public.email_log.status is
  'queued = saved before provider call; sent = provider accepted; failed = provider error; skipped = suppressed by user prefs.';

create index if not exists email_log_user_id_idx on public.email_log (user_id);
create index if not exists email_log_template_idx on public.email_log (template);
create index if not exists email_log_created_at_idx on public.email_log (created_at desc);

-- ---------- RLS -------------------------------------------------------------

alter table public.email_log enable row level security;

-- Owners may read their own log rows (e.g. account → email history page).
-- Inserts and updates are service-role only.
drop policy if exists email_log_owner_select on public.email_log;
create policy email_log_owner_select
  on public.email_log
  for select
  using (auth.uid() = user_id);
