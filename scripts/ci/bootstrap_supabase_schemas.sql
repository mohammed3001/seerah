-- =============================================================================
-- scripts/ci/bootstrap_supabase_schemas.sql
-- Mock the bits of the Supabase platform that our migrations reference so we
-- can apply them against a vanilla Postgres in CI. NEVER run on a real
-- Supabase project — Supabase already provides these.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "unaccent";

-- ---------- mock auth schema ------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ---------- mock storage schema --------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(path text)
returns text[]
language sql
immutable
as $$
  select string_to_array(path, '/');
$$;
