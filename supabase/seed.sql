-- =============================================================================
-- supabase/seed.sql
-- Local-development seed data. Applied after migrations on `supabase db reset`.
-- Keep idempotent — production never runs this file.
-- =============================================================================

-- Templates beyond the migration-baked default can be added here for local dev.
insert into public.templates (id, name, name_ar, category, is_premium, sort_order)
values
  ('template_modern_01', 'Modern', 'حديث', 'modern', false, 1),
  ('template_minimal_01', 'Minimal', 'بسيط', 'minimal', false, 2),
  ('template_executive_01', 'Executive', 'تنفيذي', 'executive', true, 10)
on conflict (id) do nothing;
