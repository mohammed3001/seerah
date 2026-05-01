-- =============================================================================
-- 20260501120200_resumes.sql
-- Resumes — primary aggregate root for the editor.
-- =============================================================================

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'My Resume',
  slug text not null unique,
  template_id text not null default 'template_clean_01',
  language text not null default 'ar' check (language in ('ar', 'en')),
  is_public boolean not null default true,
  password_hash text,
  hide_from_search boolean not null default false,
  completion_score int not null default 0 check (completion_score between 0 and 100),
  custom_url text unique,
  views_count int not null default 0,
  theme jsonb not null default '{"mode":"light"}'::jsonb,
  section_order jsonb not null default '["personal","education","experience","skills","languages","courses","projects","references","hobbies","links","address"]'::jsonb,
  section_labels jsonb not null default '{}'::jsonb,
  hidden_fields jsonb not null default '[]'::jsonb,
  show_education_first boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.resumes is 'Top-level resume document. All section tables reference this via resume_id.';
comment on column public.resumes.slug is 'URL-safe identifier for /r/<slug>.';
comment on column public.resumes.custom_url is 'User-chosen vanity slug (Prime+ feature).';

create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_slug_idx on public.resumes (slug);
create index if not exists resumes_custom_url_idx on public.resumes (custom_url) where custom_url is not null;
create index if not exists resumes_updated_at_idx on public.resumes (updated_at desc);
