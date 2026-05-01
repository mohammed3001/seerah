-- =============================================================================
-- 20260501120300_resume_sections.sql
-- Per-section tables (personal_info, education, experience, etc.).
-- All cascade-delete with their parent resume.
-- =============================================================================

-- ---------- Personal info (1:1 with resume) ----------------------------------
create table if not exists public.personal_info (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null unique references public.resumes(id) on delete cascade,
  full_name text,
  job_title text,
  bio text,
  email text,
  phone text,
  phone_country_code text default '+966',
  website text,
  city text,
  country text,
  nationality text,
  date_of_birth date,
  gender text check (gender in ('male', 'female')),
  marital_status text check (marital_status in ('single', 'married', 'divorced', 'widowed')),
  health_status text check (health_status in ('healthy', 'has_condition', 'hidden')),
  military_service text check (military_service in ('yes', 'no', 'hidden')),
  avatar_path text,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

-- ---------- Education --------------------------------------------------------
create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  institution text,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists education_resume_id_sort_idx on public.education (resume_id, sort_order);

-- ---------- Experience -------------------------------------------------------
create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  company text,
  job_title text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists experience_resume_id_sort_idx on public.experience (resume_id, sort_order);

-- ---------- Skills -----------------------------------------------------------
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text not null,
  level text check (level in ('beginner', 'intermediate', 'good', 'advanced', 'expert')),
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create index if not exists skills_resume_id_sort_idx on public.skills (resume_id, sort_order);

-- ---------- Languages --------------------------------------------------------
create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  language_name text not null,
  fluency text check (fluency in ('beginner', 'limited', 'professional', 'full', 'native')),
  is_sign_language boolean not null default false,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create index if not exists languages_resume_id_sort_idx on public.languages (resume_id, sort_order);

-- ---------- Courses ----------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text,
  institution text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists courses_resume_id_sort_idx on public.courses (resume_id, sort_order);

-- ---------- Projects ---------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text,
  url text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists projects_resume_id_sort_idx on public.projects (resume_id, sort_order);

-- ---------- References -------------------------------------------------------
-- NOTE: "references" is a SQL reserved word; quote it everywhere it is referenced.
create table if not exists public."references" (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text,
  email text,
  phone text,
  phone_country_code text default '+966',
  description text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists references_resume_id_sort_idx on public."references" (resume_id, sort_order);

-- ---------- Social links -----------------------------------------------------
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  url text,
  link_type text,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create index if not exists social_links_resume_id_sort_idx on public.social_links (resume_id, sort_order);

-- ---------- Hobbies ----------------------------------------------------------
create table if not exists public.hobbies (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);

create index if not exists hobbies_resume_id_sort_idx on public.hobbies (resume_id, sort_order);

-- ---------- Address (1:1) ----------------------------------------------------
create table if not exists public.address (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null unique references public.resumes(id) on delete cascade,
  national_address text,
  ar jsonb not null default '{}'::jsonb,
  en jsonb not null default '{}'::jsonb
);
