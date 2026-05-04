/**
 * Pure types shared between server (data fetcher) and client (UI islands).
 * No `server-only` directive so client components can import the helpers
 * without dragging the Supabase client into the bundle.
 */

export type ResumeLanguage = "ar" | "en";

export const LANGUAGE_OPTIONS: readonly ResumeLanguage[] = ["ar", "en"];

export const LANGUAGE_LABELS_AR: Record<ResumeLanguage, string> = {
  ar: "عربي",
  en: "إنجليزي",
};

export type ResumeFeaturedFilter = "featured" | "not_featured";

export const FEATURED_OPTIONS: readonly ResumeFeaturedFilter[] = [
  "featured",
  "not_featured",
];

export const FEATURED_LABELS_AR: Record<ResumeFeaturedFilter, string> = {
  featured: "مميزة",
  not_featured: "غير مميزة",
};

export type ResumeSortKey =
  | "created_at"
  | "updated_at"
  | "title"
  | "completion_score"
  | "views_count";

export const SORT_KEYS: readonly ResumeSortKey[] = [
  "created_at",
  "updated_at",
  "title",
  "completion_score",
  "views_count",
];

export interface ResumeListFilters {
  q?: string;
  templateId?: string;
  language?: ResumeLanguage;
  featured?: ResumeFeaturedFilter;
  /** Inclusive; matched against `completion_score`. */
  completionMin?: number;
  /** Inclusive; matched against `completion_score`. */
  completionMax?: number;
  /** ISO date — matched against `created_at`. */
  from?: string;
  to?: string;
  sort?: ResumeSortKey;
  dir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface ResumeListRow {
  id: string;
  title: string;
  slug: string;
  template_id: string;
  template_name: string | null;
  template_name_ar: string | null;
  language: ResumeLanguage;
  completion_score: number;
  views_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  user_avatar_url: string | null;
}

export interface TemplateOption {
  id: string;
  name: string;
  name_ar: string | null;
}

export interface ResumeListResult {
  rows: ResumeListRow[];
  total: number;
  page: number;
  perPage: number;
  templates: TemplateOption[];
}

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;
export type ResumePerPage = (typeof PER_PAGE_OPTIONS)[number];

export const DEFAULT_PER_PAGE: ResumePerPage = 20;

/** Pretty Arabic label for a template, falling back to the English name. */
export function templateLabel(
  templateId: string,
  templates: TemplateOption[],
): string {
  const t = templates.find((x) => x.id === templateId);
  if (!t) return templateId;
  return t.name_ar ?? t.name;
}
