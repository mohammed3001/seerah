-- =============================================================================
-- 20260501120900_seed_templates.sql
-- Seed the canonical default template so new resumes have a valid template_id.
-- Additional templates land in follow-up migrations as the design system grows.
-- =============================================================================

insert into public.templates (id, name, name_ar, category, is_premium, is_active, sort_order)
values ('template_clean_01', 'Clean', 'كلاسيكي', 'modern', false, true, 0)
on conflict (id) do update
  set name = excluded.name,
      name_ar = excluded.name_ar,
      category = excluded.category,
      is_premium = excluded.is_premium,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
