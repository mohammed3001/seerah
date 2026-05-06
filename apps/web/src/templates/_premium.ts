/**
 * Helper functions shared across the inline-styled premium template family
 * (Executive Dark, Creative Sidebar, Tech Developer, Elegant Serif, Compact
 * One Page).
 *
 * These templates intentionally bypass the Tailwind-driven shared atoms used
 * by the entry-tier templates because their visual designs depend on
 * pixel-precise inline styles (gradients, fixed widths, dual-column overflow
 * handling). The helpers below recreate the tiny set of utilities each
 * template needs while keeping all data access typed against the project's
 * canonical `LoadedResume` shape.
 */

import type { LoadedResume } from "@/lib/editor/load-resume";
import type { TemplateLanguage } from "./types";

/* -------------------------------------------------------------------------- */
/*  Localized field accessor                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Pick a localized field off any DB row that follows the project's bilingual
 * convention: a row may carry `ar: { … }` and `en: { … }` JSON columns whose
 * keys override the plain top-level columns when set. Falls back to the plain
 * column, then to an empty string.
 */
export function loc<T extends Record<string, unknown>>(
  item: T | null | undefined,
  field: string,
  language: TemplateLanguage,
): string {
  if (!item) return "";
  const localizedBag = item[language] as Record<string, unknown> | undefined;
  const localizedValue = localizedBag?.[field];
  if (typeof localizedValue === "string" && localizedValue.length > 0) {
    return localizedValue;
  }
  const fallback = item[field];
  return typeof fallback === "string" ? fallback : "";
}

/* -------------------------------------------------------------------------- */
/*  List helpers                                                              */
/* -------------------------------------------------------------------------- */

export function vis<T extends { is_visible?: boolean | null }>(arr: T[] | null | undefined): T[] {
  return (arr ?? []).filter((item) => item.is_visible !== false);
}

export function sorted<T extends { sort_order?: number | null }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/* -------------------------------------------------------------------------- */
/*  Date formatter                                                            */
/* -------------------------------------------------------------------------- */

const DATE_FORMAT_OPTIONS_SHORT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
};

const DATE_FORMAT_OPTIONS_LONG: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
};

export function fmtDate(
  iso: string | null | undefined,
  language: TemplateLanguage = "ar",
  variant: "short" | "long" = "short",
): string {
  if (!iso) return "";
  try {
    const options = variant === "long" ? DATE_FORMAT_OPTIONS_LONG : DATE_FORMAT_OPTIONS_SHORT;
    const locale = language === "ar" ? "ar-SA" : "en-US";
    return new Date(iso).toLocaleDateString(locale, options);
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/*  Per-resume metadata accessors                                             */
/* -------------------------------------------------------------------------- */

/** Hidden field keys (e.g. `["avatar","email"]`) the user has opted out of. */
export function getHidden(data: LoadedResume): Set<string> {
  const raw = data.resume.hidden_fields as string[] | null | undefined;
  return new Set(raw ?? []);
}

/** Custom section labels keyed by section slug. */
export function getSectionLabels(data: LoadedResume): Record<string, string> {
  const raw = data.resume.section_labels as Record<string, string> | null | undefined;
  return raw ?? {};
}

/* -------------------------------------------------------------------------- */
/*  Skill / fluency lookups                                                   */
/* -------------------------------------------------------------------------- */

/** Maps the project's enum levels to a 1–5 dot count for skill bars. */
export const SKILL_LEVEL_DOTS: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  good: 3,
  advanced: 4,
  expert: 5,
};

export const FLUENCY_DOTS: Record<string, number> = {
  beginner: 1,
  limited: 2,
  professional: 3,
  full: 4,
  native: 5,
};

export const FLUENCY_LABELS_AR: Record<string, string> = {
  beginner: "مبتدئ",
  limited: "محدود",
  professional: "مهني",
  full: "طلاقة كاملة",
  native: "اللغة الأم",
};

export const FLUENCY_LABELS_EN: Record<string, string> = {
  beginner: "Beginner",
  limited: "Limited",
  professional: "Professional",
  full: "Full Proficiency",
  native: "Native",
};

export function fluencyLabel(level: string | null | undefined, language: TemplateLanguage): string {
  const key = level ?? "professional";
  return language === "ar"
    ? (FLUENCY_LABELS_AR[key] ?? FLUENCY_LABELS_AR.professional!)
    : (FLUENCY_LABELS_EN[key] ?? FLUENCY_LABELS_EN.professional!);
}

/* -------------------------------------------------------------------------- */
/*  Section-heading default labels                                            */
/* -------------------------------------------------------------------------- */

export const SECTION_LABEL_AR: Record<string, string> = {
  personal: "معلومات الاتصال",
  experience: "الخبرة العملية",
  education: "المؤهلات العلمية",
  skills: "المهارات",
  languages: "اللغات",
  courses: "الدورات التدريبية",
  projects: "المشاريع",
  references: "المراجع",
  hobbies: "الاهتمامات",
};

export const SECTION_LABEL_EN: Record<string, string> = {
  personal: "Contact",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  courses: "Courses",
  projects: "Projects",
  references: "References",
  hobbies: "Interests",
};

export function premiumSectionLabel(
  key: string,
  language: TemplateLanguage,
  customLabels: Record<string, string>,
): string {
  if (customLabels[key]) return customLabels[key]!;
  return language === "ar" ? (SECTION_LABEL_AR[key] ?? key) : (SECTION_LABEL_EN[key] ?? key);
}

/* -------------------------------------------------------------------------- */
/*  Colour helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Returns a darker variant of a hex colour by the given percent (0–100). */
export function darken(hex: string, pct: number): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return hex;
  const n = parseInt(cleaned, 16);
  if (Number.isNaN(n)) return hex;
  const shift = Math.round(2.55 * pct);
  const r = Math.max(0, (n >> 16) - shift);
  const g = Math.max(0, ((n >> 8) & 0xff) - shift);
  const b = Math.max(0, (n & 0xff) - shift);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Resolve the accent colour, falling back to the template default. */
export function resolveAccent(theme: { primaryColor?: string }, fallback: string): string {
  return theme.primaryColor && /^#[0-9a-fA-F]{6}$/.test(theme.primaryColor)
    ? theme.primaryColor
    : fallback;
}

/* -------------------------------------------------------------------------- */
/*  Font stacks                                                               */
/* -------------------------------------------------------------------------- */
/*  Each premium template references one of the stacks below so the right    */
/*  Next/font CSS variable wins for the active language. Stacks always       */
/*  fall back through Cairo (Arabic) / Latin defaults so server-side render  */
/*  is never blank if the variable hasn't loaded yet.                        */

export const FONT_STACKS = {
  serif: {
    ar: "var(--font-cairo), 'Cairo', 'Amiri', 'Noto Naskh Arabic', serif",
    en: "var(--font-cormorant), 'Cormorant Garamond', 'EB Garamond', Georgia, serif",
  },
  sansClassic: {
    ar: "var(--font-cairo), 'Cairo', 'Noto Naskh Arabic', sans-serif",
    en: "var(--font-dm-sans), 'DM Sans', 'Inter', system-ui, sans-serif",
  },
  display: {
    ar: "var(--font-cairo), 'Cairo', 'Noto Naskh Arabic', sans-serif",
    en: "var(--font-montserrat), 'Montserrat', 'Inter', sans-serif",
  },
  mono: "var(--font-mono), 'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  jost: {
    ar: "var(--font-cairo), 'Cairo', 'Noto Naskh Arabic', sans-serif",
    en: "var(--font-jost), 'Jost', 'Nunito', system-ui, sans-serif",
  },
  jakarta: {
    ar: "var(--font-cairo), 'Cairo', 'Noto Naskh Arabic', sans-serif",
    en: "var(--font-jakarta), 'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
  },
} as const;

export function pickFontStack(
  stack: { ar: string; en: string },
  language: TemplateLanguage,
): string {
  return language === "ar" ? stack.ar : stack.en;
}

/* -------------------------------------------------------------------------- */
/*  Defaults applied when a localized full_name is missing                    */
/* -------------------------------------------------------------------------- */

export function defaultName(language: TemplateLanguage): string {
  return language === "ar" ? "الاسم الكامل" : "Full Name";
}

export function presentLabel(language: TemplateLanguage): string {
  return language === "ar" ? "حتى الآن" : "Present";
}
