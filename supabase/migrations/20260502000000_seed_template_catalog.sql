-- =============================================================================
-- 20260502000000_seed_template_catalog.sql
-- Seed the full 10-template catalog used by the design picker. Replaces the
-- single placeholder `template_clean_01` row with the canonical set the
-- frontend registry expects (apps/web/src/templates/index.tsx).
-- =============================================================================

-- ---------- Insert / update each catalog entry --------------------------------

insert into public.templates (id, name, name_ar, category, is_premium, is_active, sort_order)
values
  ('template_clean_modern',         'Clean Modern',        'كلاسيكي',     'modern',    false, true,  0),
  ('template_professional_two_col', 'Professional',        'احترافي',     'modern',    false, true,  1),
  ('template_minimal_lines',        'Minimal Lines',       'هادئ',        'minimal',   false, true,  2),
  ('template_executive_dark',       'Executive Dark',      'تنفيذي',      'executive', true,  true,  3),
  ('template_creative_sidebar',     'Creative Sidebar',    'إبداعي',      'creative',  true,  true,  4),
  ('template_tech_developer',       'Tech Developer',      'مطوّر',        'tech',      true,  true,  5),
  ('template_elegant_feminine',     'Elegant',             'أنيق',        'creative',  true,  true,  6),
  ('template_academic_research',    'Academic',            'أكاديمي',     'academic',  true,  true,  7),
  ('template_compact_one_page',     'Compact',             'صفحة واحدة',  'minimal',   true,  true,  8),
  ('template_infographic_modern',   'Infographic',         'إنفوغرافيك',  'creative',  true,  true,  9)
on conflict (id) do update
  set name = excluded.name,
      name_ar = excluded.name_ar,
      category = excluded.category,
      is_premium = excluded.is_premium,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

-- ---------- Migrate existing resumes off the legacy id ------------------------
-- Anything still pointing at the placeholder slug becomes the new default.

update public.resumes
   set template_id = 'template_clean_modern'
 where template_id = 'template_clean_01';

-- ---------- Update the column default ----------------------------------------

alter table public.resumes
  alter column template_id set default 'template_clean_modern';

-- ---------- Deactivate the legacy row (keep it for audit, hide from picker) ---

update public.templates
   set is_active = false,
       sort_order = 999
 where id = 'template_clean_01';
