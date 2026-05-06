/**
 * Templates Manager — shared types.
 *
 * The catalog is small (≤ 50 entries even with growth) so the admin page
 * loads everything in a single query rather than paginating.  This makes
 * inline reorder / pricing toggles trivial: the UI always has the full
 * ordered list to send to admin_reorder_templates.
 */

export const TEMPLATE_CATEGORIES = [
  "modern",
  "professional",
  "creative",
  "academic",
  "executive",
  "minimal",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CATEGORY_LABELS_AR: Record<TemplateCategory, string> = {
  modern: "حديث",
  professional: "احترافي",
  creative: "إبداعي",
  academic: "أكاديمي",
  executive: "تنفيذي",
  minimal: "هادئ",
};

export interface AdminTemplateRow {
  id: string;
  name: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  category: string;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Number of resumes currently using this template. */
  usage_count: number;
}

export interface TemplatesListResult {
  rows: AdminTemplateRow[];
}

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB — matches bucket policy.

export type TemplateImageKind = "thumbnail" | "preview";
