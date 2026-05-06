/**
 * Pure data-shaping helpers shared across templates. Kept framework-free so
 * server components, client components, and the export render route all use
 * identical logic.
 */

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { SectionKey } from "@/lib/editor/sections";
import type { TemplateLanguage } from "./types";

export const DEFAULT_SECTION_ORDER: readonly SectionKey[] = [
  "personal",
  "education",
  "experience",
  "skills",
  "languages",
  "courses",
  "projects",
  "references",
  "hobbies",
  "links",
  "address",
] as const;

export function getSectionOrder(data: LoadedResume): SectionKey[] {
  const stored = data.resume.section_order as SectionKey[] | null | undefined;
  return stored?.length ? stored : [...DEFAULT_SECTION_ORDER];
}

export function getHiddenFields(data: LoadedResume): Set<string> {
  return new Set((data.resume.hidden_fields as string[] | null | undefined) ?? []);
}

/** Return the bilingual sub-object for a record, falling back to plain fields. */
export function localized<T extends Record<string, unknown>>(
  row: T | null | undefined,
  language: TemplateLanguage,
): Record<string, string> {
  if (!row) return {};
  return ((row[language] as Record<string, string>) ?? {}) as Record<string, string>;
}

/** Pick the localized value for a field, falling back to the plain column. */
export function pick<T extends Record<string, unknown>>(
  row: T | null | undefined,
  language: TemplateLanguage,
  key: string,
): string {
  if (!row) return "";
  const local = localized(row, language);
  if (local[key]) return String(local[key]);
  const fallback = row[key];
  return typeof fallback === "string" ? fallback : "";
}

export function formatYearMonth(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 7);
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent: boolean | null | undefined,
  language: TemplateLanguage,
): string {
  if (!start && !end && !isCurrent) return "";
  const presentLabel = language === "ar" ? "حتى الآن" : "Present";
  const left = formatYearMonth(start);
  const right = isCurrent ? presentLabel : formatYearMonth(end);
  if (!left && !right) return "";
  return [left || "—", right || "—"].join(" – ");
}

export const SKILL_LEVEL_AR: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  good: "جيد",
  advanced: "متقدم",
  expert: "خبير",
};

export const SKILL_LEVEL_EN: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  good: "Proficient",
  advanced: "Advanced",
  expert: "Expert",
};

export const SKILL_LEVEL_PCT: Record<string, number> = {
  beginner: 0.2,
  intermediate: 0.4,
  good: 0.6,
  advanced: 0.8,
  expert: 1,
};

export const FLUENCY_AR: Record<string, string> = {
  beginner: "مبتدئ",
  limited: "محدود",
  professional: "احترافي",
  full: "إجادة تامة",
  native: "اللغة الأم",
};

export const FLUENCY_EN: Record<string, string> = {
  beginner: "Beginner",
  limited: "Limited",
  professional: "Professional",
  full: "Full Working",
  native: "Native",
};

export function skillLevel(level: string | null | undefined, language: TemplateLanguage): string {
  if (!level) return "";
  return language === "ar" ? (SKILL_LEVEL_AR[level] ?? "") : (SKILL_LEVEL_EN[level] ?? "");
}

export function fluency(level: string | null | undefined, language: TemplateLanguage): string {
  if (!level) return "";
  return language === "ar" ? (FLUENCY_AR[level] ?? "") : (FLUENCY_EN[level] ?? "");
}

/** Accent colour to use for chrome elements. Hex value, no validation. */
export function resolveAccent(theme: { primaryColor?: string }, fallback: string): string {
  return theme.primaryColor && /^#[0-9a-fA-F]{6}$/.test(theme.primaryColor)
    ? theme.primaryColor
    : fallback;
}

const SECTION_LABEL_AR: Record<SectionKey, string> = {
  personal: "نبذة",
  education: "المؤهلات العلمية",
  experience: "الخبرة العملية",
  courses: "الدورات التدريبية",
  skills: "المهارات",
  projects: "المشاريع",
  references: "المراجع",
  languages: "اللغات",
  links: "الروابط",
  hobbies: "الهوايات",
  address: "العنوان",
};

const SECTION_LABEL_EN: Record<SectionKey, string> = {
  personal: "Profile",
  education: "Education",
  experience: "Experience",
  courses: "Courses",
  skills: "Skills",
  projects: "Projects",
  references: "References",
  languages: "Languages",
  links: "Links",
  hobbies: "Interests",
  address: "Address",
};

export function sectionLabel(key: SectionKey, language: TemplateLanguage): string {
  return language === "ar" ? SECTION_LABEL_AR[key] : SECTION_LABEL_EN[key];
}
