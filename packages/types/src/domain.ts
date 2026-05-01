/**
 * Hand-written domain types that mirror the Supabase schema.
 * Generated DB types live in ./database.ts (regenerate via `pnpm db:types`).
 */

export type Plan = "free" | "prime" | "enterprise";
export type Language = "ar" | "en";
export type Gender = "male" | "female";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type HealthStatus = "healthy" | "has_condition" | "hidden";
export type MilitaryService = "yes" | "no" | "hidden";
export type SkillLevel = "beginner" | "intermediate" | "good" | "advanced" | "expert";
export type LanguageFluency = "beginner" | "limited" | "professional" | "full" | "native";
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type ThemeMode = "light" | "dark";

export type SectionKey =
  | "personal"
  | "education"
  | "experience"
  | "skills"
  | "languages"
  | "courses"
  | "projects"
  | "references"
  | "hobbies"
  | "links"
  | "address";

export interface ResumeTheme {
  mode: ThemeMode;
  primary_color?: string;
  font_family?: string;
}

export interface LocalizedField {
  ar?: string;
  en?: string;
}

export interface ResumeViewSummary {
  resume_id: string;
  views_count: number;
  last_viewed_at: string | null;
}
