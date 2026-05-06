/**
 * Shared types for the resume template system.
 *
 * Every template in `apps/web/src/templates/` is a React component that
 * accepts {@link TemplateProps} and renders an A4 page bound to the live
 * resume data. Templates work in both the in-editor live preview and the
 * dedicated `/render/[id]` route consumed by the export service — the same
 * component renders pixel-for-pixel in both places.
 */

import type { LoadedResume } from "@/lib/editor/load-resume";

export type TemplateLanguage = "ar" | "en";
export type TemplateMode = "light" | "dark";

export interface TemplateTheme {
  mode: TemplateMode;
  /** Accent colour applied to headings, dividers, sidebar fills, etc. */
  primaryColor?: string;
}

export interface TemplateProps {
  data: LoadedResume;
  language: TemplateLanguage;
  theme: TemplateTheme;
  /** True for the export route — disables animations / lazy-loading. */
  isExport: boolean;
  /** Preview zoom multiplier (50% / 75% / 100%). */
  scale?: number;
}

export type TemplateId =
  | "template_clean_modern"
  | "template_professional_two_col"
  | "template_minimal_lines"
  | "template_executive_dark"
  | "template_creative_sidebar"
  | "template_tech_developer"
  | "template_elegant_feminine"
  | "template_academic_research"
  | "template_compact_one_page"
  | "template_infographic_modern"
  | "template_elegant_serif";

export interface TemplateMeta {
  id: TemplateId;
  name_ar: string;
  name_en: string;
  category: "modern" | "minimal" | "executive" | "creative" | "tech" | "academic";
  is_premium: boolean;
  /** Default accent colour (CSS hex) applied when the user hasn't picked one. */
  default_color: string;
  /** Eight allowed accent colours surfaced in the picker. */
  palette: readonly string[];
  /** Optional short Arabic tagline for the picker card. */
  tagline_ar: string;
  tagline_en: string;
  /** Component renders the actual A4 page. */
  Component: React.ComponentType<TemplateProps>;
}

export const DEFAULT_PALETTE = [
  "#635BFF",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#0F172A",
] as const;
