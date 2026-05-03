-- =============================================================================
-- 20260505000000_admin_panel_foundation.sql
-- Admin panel — Phase A1 (foundation schema).
-- Adds:
--   * admin_users / admin_sessions / admin_audit_log / admin_ip_allowlist /
--     admin_notes — separate identity + audit subsystem for the admin app.
--   * app_settings — generic key/value store driving app-level toggles
--     (maintenance mode, AI emergency disable, announcement banner, etc.).
--   * featured_resumes — opt-in showcase pins set by template_manager+ admins.
--   * announcements — banner messages shown across the user-facing app.
--   * ai_rate_limit_overrides — per-user override of the AI daily limit.
--   * Adds support_tickets.assigned_to / .priority / .last_admin_reply_at,
--     templates.description_*, profiles.is_disabled / .last_seen_at,
--     ai_usage.cost_estimate_usd / .is_error / .error_message.
--   * Storage buckets: template-previews (public read), admin-uploads (private).
--
-- All admin-only tables enable RLS with NO policies — they are reachable only
-- through the service-role key, which the admin app holds and the user-facing
-- web app does not.  This makes accidental exposure via PostgREST impossible.
-- Forward-only.  Idempotent.
-- =============================================================================

-- ---------- helper: updated_at trigger function (re-usable) -----------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- admin_users -----------------------------------------------------

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'support_agent' check (role in ('super_admin', 'support_agent', 'template_manager')),
  totp_secret text,
  totp_verified_at timestamptz,
  is_active boolean not null default true,
  last_login_at timestamptz,
  last_login_ip inet,
  failed_login_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Admin operators. Separate identity from auth.users — has its own login flow with TOTP. Read/write via service-role only.';
comment on column public.admin_users.password_hash is 'bcrypt hash, cost factor >= 10.';
comment on column public.admin_users.totp_secret is
  'base32 TOTP secret. Only present after first password setup; cleared if admin requests reset.';
comment on column public.admin_users.totp_verified_at is
  'First successful TOTP verification. Until set, the account must complete the 2FA setup flow on next login.';

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create index if not exists admin_users_role_idx on public.admin_users (role) where is_active;

-- ---------- admin_sessions --------------------------------------------------

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_users(id) on delete cascade,
  token_hash text not null,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

comment on table public.admin_sessions is
  'Server-side sessions for the admin app. Cookie holds an opaque token; only its sha256 hash is stored here so a DB leak does not surrender live sessions.';

create unique index if not exists admin_sessions_token_hash_uidx on public.admin_sessions (token_hash);
create index if not exists admin_sessions_admin_id_idx on public.admin_sessions (admin_id);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at) where revoked_at is null;

-- ---------- admin_audit_log -------------------------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  admin_email text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Every admin action recorded here. admin_email is denormalized so the row survives admin deletion (retention).';
comment on column public.admin_audit_log.action is
  'Dotted name, e.g. user.update_plan, subscription.cancel, template.toggle_active, settings.update.';

create index if not exists admin_audit_log_admin_id_created_idx on public.admin_audit_log (admin_id, created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_type, target_id);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_action_idx on public.admin_audit_log (action);

-- ---------- admin_ip_allowlist ---------------------------------------------

create table if not exists public.admin_ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  cidr cidr not null,
  label text,
  created_by uuid references public.admin_users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.admin_ip_allowlist is
  'When at least one row is is_active=true, the admin middleware refuses any request whose IP is not contained in the active set.  Empty/no-active = allow-all (with a banner warning).';

create index if not exists admin_ip_allowlist_active_idx on public.admin_ip_allowlist (is_active) where is_active;

-- ---------- admin_notes ----------------------------------------------------

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('user', 'resume', 'ticket')),
  target_id uuid not null,
  admin_id uuid references public.admin_users(id) on delete set null,
  admin_email text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_notes is
  'Internal admin notes attached to a user / resume / ticket. Never shown to end users.';

drop trigger if exists trg_admin_notes_updated_at on public.admin_notes;
create trigger trg_admin_notes_updated_at
  before update on public.admin_notes
  for each row execute function public.set_updated_at();

create index if not exists admin_notes_target_idx on public.admin_notes (target_type, target_id, created_at desc);
create index if not exists admin_notes_admin_id_idx on public.admin_notes (admin_id);

-- ---------- app_settings ----------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Generic key/value app-level configuration. Sample keys: maintenance_mode, ai_globally_disabled, registrations_open, announcement_banner.';

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed sensible defaults so the admin UI has something to read on first load.
insert into public.app_settings (key, value) values
  ('maintenance_mode',      jsonb_build_object('enabled', false, 'message_ar', '', 'message_en', '')),
  ('ai_globally_disabled',  jsonb_build_object('enabled', false, 'reason', '')),
  ('registrations_open',    jsonb_build_object('enabled', true)),
  ('announcement_banner',   jsonb_build_object('enabled', false, 'severity', 'info', 'message_ar', '', 'message_en', '')),
  ('app_meta',              jsonb_build_object('name', 'Seerah', 'description_ar', 'منشئ السير الذاتية الذكي', 'support_email', 'support@seerah.com'))
on conflict (key) do nothing;

-- ---------- featured_resumes -----------------------------------------------

create table if not exists public.featured_resumes (
  resume_id uuid primary key references public.resumes(id) on delete cascade,
  sort_order int not null default 0,
  featured_by uuid references public.admin_users(id) on delete set null,
  featured_at timestamptz not null default now()
);

comment on table public.featured_resumes is
  'Resumes pinned to the public showcase grid on the marketing site. Owner of resume must opt-in via is_public=true; admin only adds the row.';

create index if not exists featured_resumes_sort_idx on public.featured_resumes (sort_order);

-- ---------- announcements --------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_ar text,
  title_en text,
  body_ar text,
  body_en text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create index if not exists announcements_active_idx on public.announcements (is_active, starts_at, ends_at);

-- ---------- ai_rate_limit_overrides ----------------------------------------

create table if not exists public.ai_rate_limit_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_limit int not null,
  reason text,
  admin_id uuid references public.admin_users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.ai_rate_limit_overrides is
  'Per-user override of the AI daily-request quota. NULL expires_at = permanent. Read by services/ai when the request arrives.';

create index if not exists ai_rl_overrides_expires_idx on public.ai_rate_limit_overrides (expires_at) where expires_at is not null;

-- ---------- support_tickets: assignment + priority + reply tracking --------

alter table public.support_tickets
  add column if not exists assigned_to uuid references public.admin_users(id) on delete set null,
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists last_admin_reply_at timestamptz;

create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to) where assigned_to is not null;
create index if not exists support_tickets_priority_idx on public.support_tickets (priority);

-- ---------- templates: descriptions + updated_at ---------------------------

alter table public.templates
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ---------- profiles: disable + last-seen ----------------------------------

alter table public.profiles
  add column if not exists is_disabled boolean not null default false,
  add column if not exists disabled_reason text,
  add column if not exists disabled_at timestamptz,
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc nulls last);

-- ---------- ai_usage: cost + error tracking --------------------------------

alter table public.ai_usage
  add column if not exists cost_estimate_usd numeric(10, 6),
  add column if not exists is_error boolean not null default false,
  add column if not exists error_message text;

create index if not exists ai_usage_is_error_idx on public.ai_usage (is_error, created_at desc) where is_error;

-- ---------- RLS — admin tables locked to service-role only -----------------
-- We enable RLS but add no permissive policies.  The service-role key bypasses
-- RLS server-side, so the admin app reaches everything; PostgREST clients
-- using anon/authenticated keys see nothing.

alter table public.admin_users        enable row level security;
alter table public.admin_sessions     enable row level security;
alter table public.admin_audit_log    enable row level security;
alter table public.admin_ip_allowlist enable row level security;
alter table public.admin_notes        enable row level security;
alter table public.app_settings       enable row level security;
alter table public.featured_resumes   enable row level security;
alter table public.announcements      enable row level security;
alter table public.ai_rate_limit_overrides enable row level security;

-- ---------- public reads for showcase + announcement banner ----------------
-- These two specific tables need anonymous reads so the marketing site can
-- render featured resumes and the active banner without authenticating.

drop policy if exists featured_resumes_public_read on public.featured_resumes;
create policy featured_resumes_public_read
  on public.featured_resumes
  for select
  using (true);

drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read
  on public.announcements
  for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  );

-- ---------- public reads for app_settings (whitelisted keys only) ----------
-- The user-facing app needs to know if maintenance_mode is on, etc.  Rather
-- than dumping the whole table, expose a SECURITY DEFINER read function that
-- only returns the keys safe for anonymous consumption.

create or replace function public.get_public_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_settings
   where key = p_key
     and key in ('maintenance_mode', 'announcement_banner', 'registrations_open', 'app_meta');
$$;

revoke all on function public.get_public_setting(text) from public;
grant execute on function public.get_public_setting(text) to anon, authenticated;

-- ---------- audit-log helper -----------------------------------------------
-- Lets the admin server write rows uniformly.  Returning the inserted id
-- keeps the wrapper terse on the client.

create or replace function public.log_admin_action(
  p_admin_id uuid,
  p_admin_email text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb,
  p_ip text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, p_action, p_target_type, p_target_id,
     coalesce(p_metadata, '{}'::jsonb),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_admin_action(uuid, text, text, text, text, jsonb, text, text) from public;
-- Only service_role calls it; no grants to anon/authenticated.

-- ---------- bootstrap helper -----------------------------------------------
-- Prevents accidental creation of additional super_admins through this entry
-- point.  Returns the inserted admin id, or NULL if any admin already exists.

create or replace function public.bootstrap_first_admin(
  p_email text,
  p_password_hash text,
  p_totp_secret text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing int;
  v_id uuid;
begin
  -- Serialise concurrent calls so the count-then-insert pattern is atomic.
  -- Without this, two concurrent invocations under READ COMMITTED could both
  -- see count(*)=0 and both insert a super_admin row with different emails,
  -- creating two operators where the contract promises one.  The lock is held
  -- to commit, so the second caller waits until the first row is visible
  -- (and then trips the count check).
  lock table public.admin_users in exclusive mode;

  select count(*) into v_existing from public.admin_users;
  if v_existing > 0 then
    return null;
  end if;

  insert into public.admin_users (email, password_hash, role, totp_secret)
  values (lower(p_email), p_password_hash, 'super_admin', p_totp_secret)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.bootstrap_first_admin(text, text, text) from public;

-- ---------- storage buckets ------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('template-previews', 'template-previews', true,  10485760, array['image/png','image/jpeg','image/webp']),
  ('admin-uploads',     'admin-uploads',     false, 26214400, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Allow anonymous read of template-previews so the public design picker can
-- pull thumbnails without authentication.
drop policy if exists template_previews_public_read on storage.objects;
create policy template_previews_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'template-previews');

-- admin-uploads: no public policies; service-role only.
