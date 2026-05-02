/**
 * Central registry of every resume template. The DB column
 * `resumes.template_id` is matched against the {@link TemplateMeta.id} keys
 * here — when adding a new template, also add a row to the seed migration
 * so it shows up in the picker for existing accounts.
 */

import * as React from "react";

import { TemplateAcademicResearch } from "./template-academic-research";
import { TemplateCleanModern } from "./template-clean-modern";
import { TemplateCompactOnePage } from "./template-compact-one-page";
import { TemplateCreativeSidebar } from "./template-creative-sidebar";
import { TemplateElegantFeminine } from "./template-elegant-feminine";
import { TemplateExecutiveDark } from "./template-executive-dark";
import { TemplateInfographicModern } from "./template-infographic-modern";
import { TemplateMinimalLines } from "./template-minimal-lines";
import { TemplateProfessionalTwoCol } from "./template-professional-two-col";
import { TemplateTechDeveloper } from "./template-tech-developer";
import { DEFAULT_PALETTE, type TemplateId, type TemplateMeta, type TemplateProps } from "./types";

const PALETTE = DEFAULT_PALETTE;

export const TEMPLATE_REGISTRY: readonly TemplateMeta[] = [
  {
    id: "template_clean_modern",
    name_ar: "كلاسيكي",
    name_en: "Clean Modern",
    category: "modern",
    is_premium: false,
    default_color: "#0F172A",
    palette: PALETTE,
    tagline_ar: "تخطيط أنيق بعمود واحد ومسافات متّزنة",
    tagline_en: "Single-column minimal layout",
    Component: TemplateCleanModern,
  },
  {
    id: "template_professional_two_col",
    name_ar: "احترافي",
    name_en: "Professional",
    category: "modern",
    is_premium: false,
    default_color: "#1E3A8A",
    palette: PALETTE,
    tagline_ar: "عمود جانبي ملوّن ومحتوى رئيسي واسع",
    tagline_en: "Coloured sidebar with wide main column",
    Component: TemplateProfessionalTwoCol,
  },
  {
    id: "template_minimal_lines",
    name_ar: "هادئ",
    name_en: "Minimal Lines",
    category: "minimal",
    is_premium: false,
    default_color: "#0EA5E9",
    palette: PALETTE,
    tagline_ar: "مساحات بيضاء واسعة وحدود رفيعة فقط",
    tagline_en: "Whitespace-heavy with thin accent lines",
    Component: TemplateMinimalLines,
  },
  {
    id: "template_executive_dark",
    name_ar: "تنفيذي",
    name_en: "Executive Dark",
    category: "executive",
    is_premium: true,
    default_color: "#C9A84C",
    palette: PALETTE,
    tagline_ar: "هيدر داكن وألوان ذهبية للمناصب التنفيذية",
    tagline_en: "Dark header with gold accents for executive roles",
    Component: TemplateExecutiveDark,
  },
  {
    id: "template_creative_sidebar",
    name_ar: "إبداعي",
    name_en: "Creative Sidebar",
    category: "creative",
    is_premium: true,
    default_color: "#8B5CF6",
    palette: PALETTE,
    tagline_ar: "ألوان متدرّجة وأيقونات لكل قسم",
    tagline_en: "Gradient sidebar with iconographic sections",
    Component: TemplateCreativeSidebar,
  },
  {
    id: "template_tech_developer",
    name_ar: "مطوّر",
    name_en: "Tech Developer",
    category: "tech",
    is_premium: true,
    default_color: "#10B981",
    palette: PALETTE,
    tagline_ar: "تصميم بإيقاع برمجي للمهندسين",
    tagline_en: "Code-inspired layout for engineers",
    Component: TemplateTechDeveloper,
  },
  {
    id: "template_elegant_feminine",
    name_ar: "أنيق",
    name_en: "Elegant",
    category: "creative",
    is_premium: true,
    default_color: "#EC4899",
    palette: PALETTE,
    tagline_ar: "ألوان دافئة وحواف ناعمة",
    tagline_en: "Soft palette with gentle radii",
    Component: TemplateElegantFeminine,
  },
  {
    id: "template_academic_research",
    name_ar: "أكاديمي",
    name_en: "Academic",
    category: "academic",
    is_premium: true,
    default_color: "#1F2937",
    palette: PALETTE,
    tagline_ar: "نمط مطبوعة علمية كثيفة المحتوى",
    tagline_en: "Publication-style dense layout",
    Component: TemplateAcademicResearch,
  },
  {
    id: "template_compact_one_page",
    name_ar: "صفحة واحدة",
    name_en: "Compact",
    category: "minimal",
    is_premium: true,
    default_color: "#0F172A",
    palette: PALETTE,
    tagline_ar: "كل شيء في صفحة واحدة بحدّ أقصى",
    tagline_en: "Everything packed into one page",
    Component: TemplateCompactOnePage,
  },
  {
    id: "template_infographic_modern",
    name_ar: "إنفوغرافيك",
    name_en: "Infographic",
    category: "creative",
    is_premium: true,
    default_color: "#F59E0B",
    palette: PALETTE,
    tagline_ar: "تصميم بصري مع شارات وأشرطة مهارات",
    tagline_en: "Visual layout with badges and skill bars",
    Component: TemplateInfographicModern,
  },
] as const;

export const TEMPLATE_BY_ID: Record<TemplateId, TemplateMeta> = Object.fromEntries(
  TEMPLATE_REGISTRY.map((t) => [t.id, t]),
) as Record<TemplateId, TemplateMeta>;

export const DEFAULT_TEMPLATE_ID: TemplateId = "template_clean_modern";

/** Resolve a template, falling back to the default if the id is unknown. */
export function resolveTemplate(id: string | null | undefined): TemplateMeta {
  if (id && id in TEMPLATE_BY_ID) {
    return TEMPLATE_BY_ID[id as TemplateId];
  }
  return TEMPLATE_BY_ID[DEFAULT_TEMPLATE_ID];
}

/** Render the template at the given id with the supplied props. */
export function RenderTemplate(props: TemplateProps & { templateId: string | null | undefined }) {
  const meta = resolveTemplate(props.templateId);
  const Component = meta.Component;
  return <Component {...props} />;
}

export type { TemplateProps, TemplateMeta, TemplateId } from "./types";
export { DEFAULT_PALETTE } from "./types";
