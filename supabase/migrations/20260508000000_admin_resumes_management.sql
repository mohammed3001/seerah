-- Admin resumes management — atomic write RPCs and bounded aggregates.
--
-- Design notes
-- ------------
-- Featured flag is stored in `featured_resumes` (resume_id PK) — a separate
-- table from PR #20.  We don't add an `is_featured` column on resumes; the
-- existing join keeps "featured" data (sort_order, featured_by, featured_at)
-- out of the hot path.
--
-- Every destructive RPC follows the same atomic pattern as PR-B1: profile
-- write + admin_audit_log insert in the same transaction so the audit row
-- can never drift out of sync with the underlying state change.

set search_path = public;

-- ---------- 1. Bounded aggregate: distinct active templates ---------------
-- Used to populate the template filter dropdown.  Walking `resumes` and
-- DISTINCT-ing `template_id` would scan the full table; instead we expose
-- the curated `templates` rows since the filter only makes sense for
-- templates that are actually selectable.
create or replace function public.admin_distinct_resume_templates()
returns table (id text, name text, name_ar text)
language sql stable security definer set search_path = public
as $$
  select t.id, t.name, t.name_ar
  from public.templates t
  where t.is_active = true
  order by t.sort_order asc, t.name asc;
$$;

revoke all on function public.admin_distinct_resume_templates() from public;
grant execute on function public.admin_distinct_resume_templates()
  to authenticated, service_role;

-- ---------- 2. admin_set_resume_template ----------------------------------
-- Atomic UPDATE + audit insert.  Validates the target template exists and
-- is active so the admin can't park a resume on a deleted template.
create or replace function public.admin_set_resume_template(
  p_resume_id uuid,
  p_template_id text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not exists (
    select 1 from public.templates
    where id = p_template_id and is_active = true
  ) then
    raise exception 'template % not active', p_template_id;
  end if;

  select template_id into v_old from public.resumes where id = p_resume_id;
  if v_old is null then
    raise exception 'resume % not found', p_resume_id;
  end if;

  update public.resumes
  set template_id = p_template_id,
      updated_at = now()
  where id = p_resume_id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.resume.template_changed',
    'resume', p_resume_id::text,
    jsonb_build_object('from', v_old, 'to', p_template_id),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_set_resume_template(
  uuid, text, uuid, text, text, text
) from public;
grant execute on function public.admin_set_resume_template(
  uuid, text, uuid, text, text, text
) to service_role;

-- ---------- 3. admin_set_resume_featured ----------------------------------
-- Toggle the featured flag.  When `p_featured = true` we upsert into
-- featured_resumes (preserving existing sort_order if any); when false we
-- delete.  The audit log captures both directions in the same transaction.
create or replace function public.admin_set_resume_featured(
  p_resume_id uuid,
  p_featured boolean,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.resumes where id = p_resume_id) then
    raise exception 'resume % not found', p_resume_id;
  end if;

  if p_featured then
    insert into public.featured_resumes (resume_id, featured_by, featured_at)
    values (p_resume_id, p_admin_id, now())
    on conflict (resume_id) do update
      set featured_by = excluded.featured_by,
          featured_at = excluded.featured_at;
  else
    delete from public.featured_resumes where resume_id = p_resume_id;
  end if;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email,
    case when p_featured then 'admin.resume.featured' else 'admin.resume.unfeatured' end,
    'resume', p_resume_id::text,
    '{}'::jsonb,
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_set_resume_featured(
  uuid, boolean, uuid, text, text, text
) from public;
grant execute on function public.admin_set_resume_featured(
  uuid, boolean, uuid, text, text, text
) to service_role;

-- ---------- 4. admin_delete_resume ----------------------------------------
-- Atomic DELETE + audit insert.  Cascades to all section tables via the
-- existing on-delete-cascade FKs (personal_info, education, etc.).  We
-- pre-capture the title/slug for the audit metadata so the audit row
-- remains useful even after the row is gone.
create or replace function public.admin_delete_resume(
  p_resume_id uuid,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_title text;
  v_slug text;
  v_template text;
begin
  select user_id, title, slug, template_id
    into v_user_id, v_title, v_slug, v_template
  from public.resumes
  where id = p_resume_id;

  if v_user_id is null then
    raise exception 'resume % not found', p_resume_id;
  end if;

  delete from public.resumes where id = p_resume_id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.resume.deleted',
    'resume', p_resume_id::text,
    jsonb_build_object(
      'user_id', v_user_id,
      'title', v_title,
      'slug', v_slug,
      'template_id', v_template
    ),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_delete_resume(
  uuid, uuid, text, text, text
) from public;
grant execute on function public.admin_delete_resume(
  uuid, uuid, text, text, text
) to service_role;
