-- =============================================================================
-- 20260513000000_admin_recovery_codes.sql
-- TOTP recovery codes for the admin panel.
--
-- Without this, an admin who loses their authenticator (phone reset, app
-- wiped, hardware lost) is permanently locked out — there is no email-
-- based fallback because we do not trust admin email recovery surfaces
-- (see PR-Audit-S4: passwords + email links are user-side; the admin
-- panel never had a self-service recovery path).
--
-- This migration adds:
--   * admin_recovery_codes — one row per code, only sha256(code) stored
--   * admin_users.recovery_codes_generated_at — bookkeeping for the UI
--     so an admin can tell when codes were last regenerated
--
-- All rows reachable only via service_role (admin app). RLS enabled with
-- no policies, identical pattern to admin_sessions.  Forward-only.
-- =============================================================================

-- ---------- admin_recovery_codes -------------------------------------------

create table if not exists public.admin_recovery_codes (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references public.admin_users(id) on delete cascade,
  -- sha256(code) hex.  Code itself is shown to the admin once and never
  -- stored.  Hash is unique so an attacker who steals the table cannot
  -- reuse a code observed in another batch.
  code_hash       text not null,
  generated_at    timestamptz not null default now(),
  used_at         timestamptz,
  used_ip         inet,
  used_user_agent text
);

comment on table public.admin_recovery_codes is
  'TOTP recovery codes for admin_users. Only sha256(code) is stored. Each code is single-use; used_at marks consumption.';
comment on column public.admin_recovery_codes.code_hash is
  'sha256 of the raw code in hex. Codes themselves are never stored.';

-- A given hash must be globally unique — defense against a collision
-- letting one code consume another admin's row.  Practically impossible
-- (sha256), but the constraint is free.
create unique index if not exists admin_recovery_codes_hash_uidx
  on public.admin_recovery_codes (code_hash);

-- Hot path: "find unused codes for admin X" during verify.
create index if not exists admin_recovery_codes_admin_unused_idx
  on public.admin_recovery_codes (admin_id)
  where used_at is null;

-- Forensic: "list all consumption events ordered by time".
create index if not exists admin_recovery_codes_used_idx
  on public.admin_recovery_codes (used_at desc)
  where used_at is not null;

alter table public.admin_recovery_codes enable row level security;

-- No policies.  Like admin_sessions, this table is service_role-only and
-- the user-facing PostgREST keys cannot reach it.

-- ---------- admin_users.recovery_codes_generated_at ------------------------

alter table public.admin_users
  add column if not exists recovery_codes_generated_at timestamptz;

comment on column public.admin_users.recovery_codes_generated_at is
  'Last time admin_recovery_codes were (re)generated for this admin. NULL = never. UI uses this to surface "regenerated N days ago" + warn when codes are stale or low.';
