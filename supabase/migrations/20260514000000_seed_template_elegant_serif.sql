-- =============================================================================
-- 20260514000000_seed_template_elegant_serif.sql
-- Add the new premium template `template_elegant_serif` to the catalog. The
-- frontend registry already references it (apps/web/src/templates/index.tsx);
-- this row makes it visible in the design picker and admin dashboard.
-- =============================================================================

insert into public.templates (id, name, name_ar, category, is_premium, is_active, sort_order)
values
  ('template_elegant_serif', 'Elegant Serif', 'الكلاسيكي الراقي', 'academic', true, true, 10)
on conflict (id) do update
  set name = excluded.name,
      name_ar = excluded.name_ar,
      category = excluded.category,
      is_premium = excluded.is_premium,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
