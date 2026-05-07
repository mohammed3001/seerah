-- =============================================================================
-- 20260517000000_db_hardening.sql
--
-- Hardens the schema against four classes of silent drift / abuse:
--
--   1. completion_score never auto-updated — section tables changed without
--      `resumes.completion_score` reflecting the new state.
--   2. resume_views INSERT did not increment `resumes.views_count` — the
--      counter was always 0 even with thousands of view rows.
--   3. profiles.max_resumes was advisory only — nothing prevented a free
--      user from creating more resumes than their plan allowed.
--   4. resumes.custom_url was UNIQUE but unconstrained for shape — slugs
--      with whitespace, slashes, or uppercase could be persisted, which
--      breaks `/r/<custom_url>` routing and SEO.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. Auto-update completion_score on every section change.
-- -------------------------------------------------------------------------
-- The trigger function calls public.calculate_completion_score(resume_id)
-- and writes the result back to resumes.completion_score. It runs AFTER
-- INSERT/UPDATE/DELETE on every section table. The update on `resumes`
-- itself does NOT touch any section table, so there is no risk of
-- recursive trigger firing.
-- security definer + locked search_path: this trigger runs whenever a
-- section row changes, including INSERTs by the row's owner. The owner
-- can update their own rows under RLS, but updating `resumes` from a
-- trigger would still hit the row-level WITH CHECK on `resumes_update_own`
-- if any code path runs as a non-owner (e.g. service role on cron jobs).
-- Running as definer keeps the trigger-effect deterministic.
create or replace function public.update_resume_completion_score()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_resume_id uuid;
  v_score int;
begin
  -- INSERT/UPDATE → NEW.resume_id; DELETE → OLD.resume_id.
  v_resume_id := coalesce(
    case when tg_op = 'DELETE' then null else (new).resume_id end,
    case when tg_op = 'DELETE' then (old).resume_id else null end
  );

  if v_resume_id is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_score := public.calculate_completion_score(v_resume_id);

  update public.resumes
    set completion_score = v_score
    where id = v_resume_id;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on function public.update_resume_completion_score is
  'Recomputes resumes.completion_score whenever a section row changes.';

-- Attach the trigger to every section table that contributes to the score.
do $$
declare
  v_table text;
begin
  for v_table in
    select unnest(array[
      'personal_info', 'education', 'experience', 'skills', 'languages',
      'courses', 'projects', 'references', 'hobbies', 'address',
      'social_links'
    ])
  loop
    execute format(
      'drop trigger if exists trg_update_completion_score on public.%I',
      v_table
    );
    execute format(
      'create trigger trg_update_completion_score '
      'after insert or update or delete on public.%I '
      'for each row execute function public.update_resume_completion_score()',
      v_table
    );
  end loop;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. Increment resumes.views_count on every resume_views INSERT.
-- -------------------------------------------------------------------------
-- security definer is REQUIRED here: the primary caller is anonymous
-- viewers hitting `/r/<slug>`, which can INSERT into `resume_views`
-- under the public RLS policy. Without `security definer`, the
-- trigger's UPDATE on `public.resumes` would be subject to
-- `resumes_update_own` (auth.uid() = user_id), which is NULL for
-- anonymous users — the UPDATE would silently match 0 rows and the
-- counter would stay at 0 forever. set search_path locks the function
-- against role-name shadow attacks.
create or replace function public.increment_resume_views_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.resumes
    set views_count = coalesce(views_count, 0) + 1
    where id = new.resume_id;
  return new;
end;
$$;

comment on function public.increment_resume_views_count is
  'Increments resumes.views_count for every public.resume_views INSERT.';

drop trigger if exists trg_increment_views_count on public.resume_views;
create trigger trg_increment_views_count
  after insert on public.resume_views
  for each row execute function public.increment_resume_views_count();

-- -------------------------------------------------------------------------
-- 3. Enforce profiles.max_resumes at INSERT time.
-- -------------------------------------------------------------------------
-- Free users default to max_resumes=1; prime upgrades raise the cap. The
-- check runs BEFORE INSERT so a user cannot create row N+1 even if they
-- bypass the application layer (eg. a misconfigured admin client).
create or replace function public.enforce_max_resumes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_max int;
  v_count int;
begin
  select max_resumes into v_max
    from public.profiles
    where id = new.user_id;

  -- If the profile row hasn't been created yet (handle_new_user trigger
  -- runs first) or max_resumes is null, fall back to the schema default
  -- of 1 — this is the conservative interpretation.
  v_max := coalesce(v_max, 1);

  select count(*) into v_count
    from public.resumes
    where user_id = new.user_id;

  if v_count >= v_max then
    raise exception
      'max_resumes_exceeded: user % already owns % resume(s) (cap = %)',
      new.user_id, v_count, v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.enforce_max_resumes is
  'Rejects resume INSERTs that would exceed the user''s plan-derived max_resumes cap.';

drop trigger if exists trg_enforce_max_resumes on public.resumes;
create trigger trg_enforce_max_resumes
  before insert on public.resumes
  for each row execute function public.enforce_max_resumes();

-- -------------------------------------------------------------------------
-- 4. Lock down custom_url + slug to a URL-safe shape.
-- -------------------------------------------------------------------------
-- Pattern:
--   * 1..64 characters
--   * starts and ends with [a-z0-9]
--   * middle may contain [a-z0-9-]
--
-- Note: NULL is allowed for custom_url (Prime-only feature). slug is
-- always populated by generate_unique_slug() which produces matching
-- output, so the existing rows satisfy the constraint.
alter table public.resumes
  drop constraint if exists resumes_custom_url_format;
alter table public.resumes
  add constraint resumes_custom_url_format check (
    custom_url is null
    or (
      length(custom_url) between 1 and 64
      and custom_url ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'
    )
  );

alter table public.resumes
  drop constraint if exists resumes_slug_format;
alter table public.resumes
  add constraint resumes_slug_format check (
    length(slug) between 1 and 80
    and slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'
  );

comment on constraint resumes_custom_url_format on public.resumes is
  'URL-safe shape: lowercase alphanumeric + hyphen, 1..64 chars, no leading/trailing hyphen.';
comment on constraint resumes_slug_format on public.resumes is
  'URL-safe shape: lowercase alphanumeric + hyphen, 1..80 chars, no leading/trailing hyphen.';
