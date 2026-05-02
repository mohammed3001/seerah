// =============================================================================
// template_meta.dart
// Static catalogue of every template, mirroring `apps/web/src/templates/index.tsx`.
// The mobile picker doesn't render the actual template (that's done by the
// PDF service and the in-app preview embeds the same render route via WebView)
// so we only need the metadata to build cards.
//
// IMPORTANT: keep ids and is_premium in sync with the web registry. Drift
// here would silently break premium gating because the server-side gate
// in /api/resume/[id]/design uses the SAME id list.
// =============================================================================

import "package:flutter/foundation.dart";

@immutable
class TemplateMeta {
  const TemplateMeta({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.taglineAr,
    required this.taglineEn,
    required this.category,
    required this.isPremium,
    required this.defaultColor,
  });

  final String id;
  final String nameAr;
  final String nameEn;
  final String taglineAr;
  final String taglineEn;
  final String category;
  final bool isPremium;
  final int defaultColor;
}

/// Eight default accent colours. Matches `DEFAULT_PALETTE` in
/// `apps/web/src/templates/types.ts`.
const List<int> kAccentPalette = [
  0xFF635BFF,
  0xFF0EA5E9,
  0xFF10B981,
  0xFFF59E0B,
  0xFFEF4444,
  0xFF8B5CF6,
  0xFFEC4899,
  0xFF0F172A,
];

/// All 10 templates, ordered the same way as the web registry — free first,
/// then premium.
const List<TemplateMeta> kTemplates = [
  TemplateMeta(
    id: "template_clean_modern",
    nameAr: "كلاسيكي",
    nameEn: "Clean Modern",
    taglineAr: "تخطيط أنيق بعمود واحد ومسافات متّزنة",
    taglineEn: "Single-column minimal layout",
    category: "modern",
    isPremium: false,
    defaultColor: 0xFF0F172A,
  ),
  TemplateMeta(
    id: "template_professional_two_col",
    nameAr: "احترافي",
    nameEn: "Professional",
    taglineAr: "عمود جانبي ملوّن ومحتوى رئيسي واسع",
    taglineEn: "Coloured sidebar with wide main column",
    category: "modern",
    isPremium: false,
    defaultColor: 0xFF1E3A8A,
  ),
  TemplateMeta(
    id: "template_minimal_lines",
    nameAr: "هادئ",
    nameEn: "Minimal Lines",
    taglineAr: "مساحات بيضاء واسعة وحدود رفيعة فقط",
    taglineEn: "Whitespace-heavy with thin accent lines",
    category: "minimal",
    isPremium: false,
    defaultColor: 0xFF0EA5E9,
  ),
  TemplateMeta(
    id: "template_executive_dark",
    nameAr: "تنفيذي",
    nameEn: "Executive Dark",
    taglineAr: "هيدر داكن وألوان ذهبية للمناصب التنفيذية",
    taglineEn: "Dark header with gold accents for executive roles",
    category: "executive",
    isPremium: true,
    defaultColor: 0xFFC9A84C,
  ),
  TemplateMeta(
    id: "template_creative_sidebar",
    nameAr: "إبداعي",
    nameEn: "Creative Sidebar",
    taglineAr: "ألوان متدرّجة وأيقونات لكل قسم",
    taglineEn: "Gradient sidebar with iconographic sections",
    category: "creative",
    isPremium: true,
    defaultColor: 0xFF8B5CF6,
  ),
  TemplateMeta(
    id: "template_tech_developer",
    nameAr: "مطوّر",
    nameEn: "Tech Developer",
    taglineAr: "تصميم بإيقاع برمجي للمهندسين",
    taglineEn: "Code-inspired layout for engineers",
    category: "tech",
    isPremium: true,
    defaultColor: 0xFF10B981,
  ),
  TemplateMeta(
    id: "template_elegant_feminine",
    nameAr: "أنيق",
    nameEn: "Elegant",
    taglineAr: "ألوان دافئة وحواف ناعمة",
    taglineEn: "Soft palette with gentle radii",
    category: "creative",
    isPremium: true,
    defaultColor: 0xFFEC4899,
  ),
  TemplateMeta(
    id: "template_academic_research",
    nameAr: "أكاديمي",
    nameEn: "Academic",
    taglineAr: "نمط مطبوعة علمية كثيفة المحتوى",
    taglineEn: "Publication-style dense layout",
    category: "academic",
    isPremium: true,
    defaultColor: 0xFF1F2937,
  ),
  TemplateMeta(
    id: "template_compact_one_page",
    nameAr: "صفحة واحدة",
    nameEn: "Compact",
    taglineAr: "كل شيء في صفحة واحدة بحدّ أقصى",
    taglineEn: "Everything packed into one page",
    category: "minimal",
    isPremium: true,
    defaultColor: 0xFF0F172A,
  ),
  TemplateMeta(
    id: "template_infographic_modern",
    nameAr: "إنفوغرافيك",
    nameEn: "Infographic",
    taglineAr: "تصميم بصري مع شارات وأشرطة مهارات",
    taglineEn: "Visual layout with badges and skill bars",
    category: "creative",
    isPremium: true,
    defaultColor: 0xFFF59E0B,
  ),
];

const String kDefaultTemplateId = "template_clean_modern";

TemplateMeta? lookupTemplate(String? id) {
  if (id == null) return null;
  for (final t in kTemplates) {
    if (t.id == id) return t;
  }
  return null;
}

TemplateMeta resolveTemplate(String? id) =>
    lookupTemplate(id) ?? kTemplates.first;
