-- =============================================================================
-- Admin Templates Management — Phase C1
-- =============================================================================
-- Adds description / description_ar / updated_at to public.templates and a
-- set of SECURITY DEFINER RPCs the admin panel uses to manage the template
-- catalog without touching code.
--
-- All destructive RPCs write to admin_audit_log atomically inside the same
-- transaction.  The bucket policies for template-previews / admin-uploads
-- are defined in 20260505000000_admin_panel_foundation.sql; this migration
-- only manipulates rows in public.templates.
--
-- The columns description_ar / description_en / updated_at and the
-- trg_templates_updated_at trigger are added in 20260505000000_admin_panel
-- _foundation.sql.  We therefore don't need to manage updated_at manually
-- inside the RPCs.
-- =============================================================================

-- ---------- 1. Schema additions ------------------------------------------

create index if not exists templates_active_sort_idx
  on public.templates (sort_order, id) where is_active;

-- ---------- 2. admin_set_template_pricing --------------------------------

create or replace function public.admin_set_template_pricing(
  p_template_id text,
  p_is_premium boolean,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old boolean;
begin
  select is_premium into v_old from public.templates where id = p_template_id;
  if v_old is null then
    raise exception 'template % not found', p_template_id;
  end if;

  if v_old = p_is_premium then
    return; -- no-op, no audit row needed when nothing changed
  end if;

  update public.templates
     set is_premium = p_is_premium
   where id = p_template_id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.template.pricing_changed',
    'template', p_template_id,
    jsonb_build_object('from', v_old, 'to', p_is_premium),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_set_template_pricing(
  text, boolean, uuid, text, text, text
) from public;

-- ---------- 3. admin_set_template_active ---------------------------------

create or replace function public.admin_set_template_active(
  p_template_id text,
  p_is_active boolean,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old boolean;
begin
  select is_active into v_old from public.templates where id = p_template_id;
  if v_old is null then
    raise exception 'template % not found', p_template_id;
  end if;

  if v_old = p_is_active then
    return;
  end if;

  update public.templates
     set is_active = p_is_active
   where id = p_template_id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.template.active_changed',
    'template', p_template_id,
    jsonb_build_object('from', v_old, 'to', p_is_active),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_set_template_active(
  text, boolean, uuid, text, text, text
) from public;

-- ---------- 4. admin_update_template_metadata ----------------------------
-- All metadata in one atomic call.  Pass null for fields the admin didn't
-- change — the function only updates non-null inputs.

create or replace function public.admin_update_template_metadata(
  p_template_id text,
  p_name text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_category text,
  p_tags text[],
  p_thumbnail_url text,
  p_preview_url text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_before record;
  v_changes jsonb := '{}'::jsonb;
begin
  select * into v_before from public.templates where id = p_template_id;
  if v_before.id is null then
    raise exception 'template % not found', p_template_id;
  end if;

  if p_name is not null and p_name <> v_before.name then
    v_changes := v_changes || jsonb_build_object(
      'name', jsonb_build_object('from', v_before.name, 'to', p_name)
    );
  end if;
  if p_name_ar is not null and p_name_ar is distinct from v_before.name_ar then
    v_changes := v_changes || jsonb_build_object(
      'name_ar', jsonb_build_object('from', v_before.name_ar, 'to', p_name_ar)
    );
  end if;
  if p_description_en is not null and p_description_en is distinct from v_before.description_en then
    v_changes := v_changes || jsonb_build_object(
      'description_en', jsonb_build_object('from', v_before.description_en, 'to', p_description_en)
    );
  end if;
  if p_description_ar is not null and p_description_ar is distinct from v_before.description_ar then
    v_changes := v_changes || jsonb_build_object(
      'description_ar', jsonb_build_object('from', v_before.description_ar, 'to', p_description_ar)
    );
  end if;
  if p_category is not null and p_category <> v_before.category then
    v_changes := v_changes || jsonb_build_object(
      'category', jsonb_build_object('from', v_before.category, 'to', p_category)
    );
  end if;
  if p_tags is not null and p_tags is distinct from v_before.tags then
    v_changes := v_changes || jsonb_build_object(
      'tags', jsonb_build_object(
        'from', to_jsonb(v_before.tags),
        'to', to_jsonb(p_tags)
      )
    );
  end if;
  if p_thumbnail_url is not null and p_thumbnail_url is distinct from v_before.thumbnail_url then
    v_changes := v_changes || jsonb_build_object(
      'thumbnail_url', jsonb_build_object('from', v_before.thumbnail_url, 'to', p_thumbnail_url)
    );
  end if;
  if p_preview_url is not null and p_preview_url is distinct from v_before.preview_url then
    v_changes := v_changes || jsonb_build_object(
      'preview_url', jsonb_build_object('from', v_before.preview_url, 'to', p_preview_url)
    );
  end if;

  update public.templates
     set name           = coalesce(p_name,           name),
         name_ar        = coalesce(p_name_ar,        name_ar),
         description_en = coalesce(p_description_en, description_en),
         description_ar = coalesce(p_description_ar, description_ar),
         category       = coalesce(p_category,       category),
         tags           = coalesce(p_tags,           tags),
         thumbnail_url  = coalesce(p_thumbnail_url,  thumbnail_url),
         preview_url    = coalesce(p_preview_url,    preview_url)
   where id = p_template_id;

  if v_changes <> '{}'::jsonb then
    insert into public.admin_audit_log (
      admin_id, admin_email, action,
      target_type, target_id, metadata, ip, user_agent
    ) values (
      p_admin_id, p_admin_email, 'admin.template.metadata_updated',
      'template', p_template_id, v_changes, p_ip, p_user_agent
    );
  end if;
end;
$$;

revoke all on function public.admin_update_template_metadata(
  text, text, text, text, text, text, text[], text, text,
  uuid, text, text, text
) from public;

-- ---------- 5. admin_reorder_templates -----------------------------------
-- Receives the full ordered array of template ids; sets sort_order to the
-- index in the array.  Atomic: either every row is updated or the whole
-- transaction rolls back.

create or replace function public.admin_reorder_templates(
  p_template_ids text[],
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_existing int;
begin
  if p_template_ids is null or array_length(p_template_ids, 1) is null then
    raise exception 'p_template_ids cannot be empty';
  end if;

  -- Reject if any input id doesn't exist (prevents silent data loss).
  select count(*)
    into v_existing
    from public.templates
   where id = any(p_template_ids);
  if v_existing <> array_length(p_template_ids, 1) then
    raise exception 'one or more template ids not found';
  end if;

  update public.templates t
     set sort_order = idx.ord - 1
    from unnest(p_template_ids) with ordinality as idx(id, ord)
   where t.id = idx.id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.template.reordered',
    'template', null,
    jsonb_build_object('order', to_jsonb(p_template_ids)),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_reorder_templates(
  text[], uuid, text, text, text
) from public;

-- ---------- 6. admin_create_template -------------------------------------

create or replace function public.admin_create_template(
  p_id text,
  p_name text,
  p_name_ar text,
  p_description_en text,
  p_description_ar text,
  p_category text,
  p_is_premium boolean,
  p_tags text[],
  p_thumbnail_url text,
  p_preview_url text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_max_sort int;
begin
  if p_id is null or length(trim(p_id)) = 0 then
    raise exception 'template id required';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'template name required';
  end if;
  if exists (select 1 from public.templates where id = p_id) then
    raise exception 'template % already exists', p_id;
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_max_sort
    from public.templates;

  insert into public.templates (
    id, name, name_ar, description_en, description_ar,
    category, is_premium, is_active, tags,
    thumbnail_url, preview_url, sort_order
  ) values (
    p_id, p_name, p_name_ar, p_description_en, p_description_ar,
    coalesce(p_category, 'modern'),
    coalesce(p_is_premium, false), true,
    coalesce(p_tags, '{}'::text[]),
    p_thumbnail_url, p_preview_url, v_max_sort
  );

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.template.created',
    'template', p_id,
    jsonb_build_object(
      'name', p_name,
      'category', p_category,
      'is_premium', coalesce(p_is_premium, false)
    ),
    p_ip, p_user_agent
  );

  return p_id;
end;
$$;

revoke all on function public.admin_create_template(
  text, text, text, text, text, text, boolean, text[], text, text,
  uuid, text, text, text
) from public;

-- ---------- 7. admin_delete_template -------------------------------------
-- Refuses to delete a template that is still referenced by any resume.
-- The admin should re-template those resumes first (Phase B2 supports
-- bulk template change).

create or replace function public.admin_delete_template(
  p_template_id text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_before record;
  v_in_use int;
begin
  select * into v_before from public.templates where id = p_template_id;
  if v_before.id is null then
    raise exception 'template % not found', p_template_id;
  end if;

  select count(*) into v_in_use
    from public.resumes
   where template_id = p_template_id;
  if v_in_use > 0 then
    raise exception 'template % is used by % resume(s)', p_template_id, v_in_use;
  end if;

  delete from public.templates where id = p_template_id;

  insert into public.admin_audit_log (
    admin_id, admin_email, action,
    target_type, target_id, metadata, ip, user_agent
  ) values (
    p_admin_id, p_admin_email, 'admin.template.deleted',
    'template', p_template_id,
    jsonb_build_object(
      'name', v_before.name,
      'name_ar', v_before.name_ar,
      'category', v_before.category,
      'is_premium', v_before.is_premium,
      'is_active', v_before.is_active,
      'thumbnail_url', v_before.thumbnail_url,
      'preview_url', v_before.preview_url
    ),
    p_ip, p_user_agent
  );
end;
$$;

revoke all on function public.admin_delete_template(
  text, uuid, text, text, text
) from public;
