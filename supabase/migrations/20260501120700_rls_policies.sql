-- =============================================================================
-- 20260501120700_rls_policies.sql
-- Row Level Security on EVERY public table.
-- Service-role bypasses RLS automatically; these policies govern anon + authed.
-- =============================================================================

-- ---------- enable RLS -------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.resumes           enable row level security;
alter table public.personal_info     enable row level security;
alter table public.education         enable row level security;
alter table public.experience        enable row level security;
alter table public.skills            enable row level security;
alter table public.languages         enable row level security;
alter table public.courses           enable row level security;
alter table public.projects          enable row level security;
alter table public."references"      enable row level security;
alter table public.social_links      enable row level security;
alter table public.hobbies           enable row level security;
alter table public.address           enable row level security;
alter table public.templates         enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.ai_usage          enable row level security;
alter table public.resume_views      enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- =============================================================================
-- resumes
-- Owner can do anything; public resumes (is_public=true and !hide_from_search)
-- are readable by anon for the public-share page.
-- =============================================================================
drop policy if exists resumes_select_own on public.resumes;
create policy resumes_select_own on public.resumes
  for select using (auth.uid() = user_id);

drop policy if exists resumes_select_public on public.resumes;
create policy resumes_select_public on public.resumes
  for select using (is_public = true);

drop policy if exists resumes_insert_own on public.resumes;
create policy resumes_insert_own on public.resumes
  for insert with check (auth.uid() = user_id);

drop policy if exists resumes_update_own on public.resumes;
create policy resumes_update_own on public.resumes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists resumes_delete_own on public.resumes;
create policy resumes_delete_own on public.resumes
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- Section tables — owner full access; public read when parent resume is public.
-- We expand a helper macro inline for each table.
-- =============================================================================

-- personal_info ---------------------------------------------------------------
drop policy if exists personal_info_owner_all on public.personal_info;
create policy personal_info_owner_all on public.personal_info
  for all
  using (
    exists (
      select 1 from public.resumes r
      where r.id = personal_info.resume_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.resumes r
      where r.id = personal_info.resume_id and r.user_id = auth.uid()
    )
  );

drop policy if exists personal_info_public_read on public.personal_info;
create policy personal_info_public_read on public.personal_info
  for select
  using (
    exists (
      select 1 from public.resumes r
      where r.id = personal_info.resume_id and r.is_public = true
    )
  );

-- education -------------------------------------------------------------------
drop policy if exists education_owner_all on public.education;
create policy education_owner_all on public.education
  for all
  using (exists (select 1 from public.resumes r where r.id = education.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = education.resume_id and r.user_id = auth.uid()));

drop policy if exists education_public_read on public.education;
create policy education_public_read on public.education
  for select
  using (exists (select 1 from public.resumes r where r.id = education.resume_id and r.is_public = true));

-- experience ------------------------------------------------------------------
drop policy if exists experience_owner_all on public.experience;
create policy experience_owner_all on public.experience
  for all
  using (exists (select 1 from public.resumes r where r.id = experience.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = experience.resume_id and r.user_id = auth.uid()));

drop policy if exists experience_public_read on public.experience;
create policy experience_public_read on public.experience
  for select
  using (exists (select 1 from public.resumes r where r.id = experience.resume_id and r.is_public = true));

-- skills ----------------------------------------------------------------------
drop policy if exists skills_owner_all on public.skills;
create policy skills_owner_all on public.skills
  for all
  using (exists (select 1 from public.resumes r where r.id = skills.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = skills.resume_id and r.user_id = auth.uid()));

drop policy if exists skills_public_read on public.skills;
create policy skills_public_read on public.skills
  for select
  using (exists (select 1 from public.resumes r where r.id = skills.resume_id and r.is_public = true));

-- languages -------------------------------------------------------------------
drop policy if exists languages_owner_all on public.languages;
create policy languages_owner_all on public.languages
  for all
  using (exists (select 1 from public.resumes r where r.id = languages.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = languages.resume_id and r.user_id = auth.uid()));

drop policy if exists languages_public_read on public.languages;
create policy languages_public_read on public.languages
  for select
  using (exists (select 1 from public.resumes r where r.id = languages.resume_id and r.is_public = true));

-- courses ---------------------------------------------------------------------
drop policy if exists courses_owner_all on public.courses;
create policy courses_owner_all on public.courses
  for all
  using (exists (select 1 from public.resumes r where r.id = courses.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = courses.resume_id and r.user_id = auth.uid()));

drop policy if exists courses_public_read on public.courses;
create policy courses_public_read on public.courses
  for select
  using (exists (select 1 from public.resumes r where r.id = courses.resume_id and r.is_public = true));

-- projects --------------------------------------------------------------------
drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects
  for all
  using (exists (select 1 from public.resumes r where r.id = projects.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = projects.resume_id and r.user_id = auth.uid()));

drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select
  using (exists (select 1 from public.resumes r where r.id = projects.resume_id and r.is_public = true));

-- references ------------------------------------------------------------------
-- NOTE: "references" is a SQL reserved word; quote it everywhere it is referenced.
drop policy if exists references_owner_all on public."references";
create policy references_owner_all on public."references"
  for all
  using (exists (select 1 from public.resumes r where r.id = "references".resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = "references".resume_id and r.user_id = auth.uid()));

drop policy if exists references_public_read on public."references";
create policy references_public_read on public."references"
  for select
  using (exists (select 1 from public.resumes r where r.id = "references".resume_id and r.is_public = true));

-- social_links ----------------------------------------------------------------
drop policy if exists social_links_owner_all on public.social_links;
create policy social_links_owner_all on public.social_links
  for all
  using (exists (select 1 from public.resumes r where r.id = social_links.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = social_links.resume_id and r.user_id = auth.uid()));

drop policy if exists social_links_public_read on public.social_links;
create policy social_links_public_read on public.social_links
  for select
  using (exists (select 1 from public.resumes r where r.id = social_links.resume_id and r.is_public = true));

-- hobbies ---------------------------------------------------------------------
drop policy if exists hobbies_owner_all on public.hobbies;
create policy hobbies_owner_all on public.hobbies
  for all
  using (exists (select 1 from public.resumes r where r.id = hobbies.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = hobbies.resume_id and r.user_id = auth.uid()));

drop policy if exists hobbies_public_read on public.hobbies;
create policy hobbies_public_read on public.hobbies
  for select
  using (exists (select 1 from public.resumes r where r.id = hobbies.resume_id and r.is_public = true));

-- address ---------------------------------------------------------------------
drop policy if exists address_owner_all on public.address;
create policy address_owner_all on public.address
  for all
  using (exists (select 1 from public.resumes r where r.id = address.resume_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.resumes r where r.id = address.resume_id and r.user_id = auth.uid()));

drop policy if exists address_public_read on public.address;
create policy address_public_read on public.address
  for select
  using (exists (select 1 from public.resumes r where r.id = address.resume_id and r.is_public = true));

-- =============================================================================
-- Templates — readable by everyone (incl. anon), writable only by service role.
-- =============================================================================
drop policy if exists templates_select_active on public.templates;
create policy templates_select_active on public.templates
  for select using (is_active = true);

-- =============================================================================
-- Subscriptions — readable by owner; writes happen via service role only.
-- =============================================================================
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using (auth.uid() = user_id);

-- =============================================================================
-- Support tickets — owner can create + read own; admins (service role) bypass.
-- =============================================================================
drop policy if exists support_tickets_insert_self on public.support_tickets;
create policy support_tickets_insert_self on public.support_tickets
  for insert with check (auth.uid() = user_id);

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets
  for select using (auth.uid() = user_id);

-- =============================================================================
-- AI usage — owner read-only; writes via service role only.
-- =============================================================================
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);

-- =============================================================================
-- Resume views — owner can read own; anon insert (one row per public view).
-- =============================================================================
drop policy if exists resume_views_select_own on public.resume_views;
create policy resume_views_select_own on public.resume_views
  for select
  using (
    exists (
      select 1 from public.resumes r
      where r.id = resume_views.resume_id and r.user_id = auth.uid()
    )
  );

drop policy if exists resume_views_insert_public on public.resume_views;
create policy resume_views_insert_public on public.resume_views
  for insert
  with check (
    exists (
      select 1 from public.resumes r
      where r.id = resume_views.resume_id and r.is_public = true
    )
  );
