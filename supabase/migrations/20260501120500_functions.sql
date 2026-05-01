-- =============================================================================
-- 20260501120500_functions.sql
-- Database functions:
--   - public.calculate_completion_score(resume_id)  → 0..100
--   - public.update_updated_at()                    → trigger function
--   - public.generate_unique_slug(name)             → slug with collision check
-- =============================================================================

-- ---------- update_updated_at ------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.update_updated_at is
  'Generic trigger function: sets updated_at = now() on row update.';

-- ---------- generate_unique_slug --------------------------------------------
-- Lower-case, replace whitespace/punct with `-`, strip diacritics, append a
-- short suffix on collision until unique inside public.resumes.slug.
create or replace function public.generate_unique_slug(p_name text)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 0;
begin
  v_base := trim(both '-' from
    regexp_replace(
      lower(unaccent(coalesce(p_name, ''))),
      '[^a-z0-9]+', '-', 'g'
    )
  );

  if v_base = '' or v_base is null then
    v_base := 'resume';
  end if;

  -- cap base length to keep slugs friendly
  if length(v_base) > 60 then
    v_base := substring(v_base from 1 for 60);
    v_base := trim(both '-' from v_base);
  end if;

  v_candidate := v_base;

  while exists (select 1 from public.resumes where slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix::text;
  end loop;

  return v_candidate;
end;
$$;

comment on function public.generate_unique_slug is
  'Generates a URL-safe slug from p_name and appends -N on collision against public.resumes.slug.';

-- ---------- calculate_completion_score --------------------------------------
-- Heuristic: weighted score based on which sections have at least one row /
-- non-null required field. Returns 0..100.
create or replace function public.calculate_completion_score(p_resume_id uuid)
returns int
language plpgsql
stable
as $$
declare
  v_score int := 0;
  v_personal record;
begin
  -- personal info: 30 points (10 for name, 10 for job_title, 10 for bio)
  select full_name, job_title, bio
    into v_personal
    from public.personal_info
    where resume_id = p_resume_id;

  if v_personal.full_name is not null and v_personal.full_name <> '' then
    v_score := v_score + 10;
  end if;
  if v_personal.job_title is not null and v_personal.job_title <> '' then
    v_score := v_score + 10;
  end if;
  if v_personal.bio is not null and v_personal.bio <> '' then
    v_score := v_score + 10;
  end if;

  -- experience: 20 points if at least one row
  if exists (select 1 from public.experience where resume_id = p_resume_id) then
    v_score := v_score + 20;
  end if;

  -- education: 15 points if at least one row
  if exists (select 1 from public.education where resume_id = p_resume_id) then
    v_score := v_score + 15;
  end if;

  -- skills: 15 points if at least 3 rows
  if (select count(*) from public.skills where resume_id = p_resume_id) >= 3 then
    v_score := v_score + 15;
  elsif exists (select 1 from public.skills where resume_id = p_resume_id) then
    v_score := v_score + 5;
  end if;

  -- languages: 10 points if at least one row
  if exists (select 1 from public.languages where resume_id = p_resume_id) then
    v_score := v_score + 10;
  end if;

  -- projects/courses combined: 10 points
  if exists (select 1 from public.projects where resume_id = p_resume_id)
     or exists (select 1 from public.courses where resume_id = p_resume_id) then
    v_score := v_score + 10;
  end if;

  if v_score > 100 then
    v_score := 100;
  end if;

  return v_score;
end;
$$;

comment on function public.calculate_completion_score is
  'Returns a 0..100 completion score for a resume based on populated sections.';
