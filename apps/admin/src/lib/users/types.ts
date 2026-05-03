/**
 * Pure types shared between server (data fetcher) and client (UI islands).
 * No `server-only` directive so client components can import the helpers
 * without dragging the Supabase client into the bundle.
 */

export type Plan = "free" | "prime" | "enterprise";

export const PLAN_OPTIONS: readonly Plan[] = ["free", "prime", "enterprise"];

export const PLAN_LABELS_AR: Record<Plan, string> = {
  free: "مجاني",
  prime: "برايم",
  enterprise: "مؤسّسي",
};

export const PLAN_BADGE_CLASSES: Record<Plan, string> = {
  free: "bg-slate-100 text-slate-700",
  prime: "bg-amber-100 text-amber-800",
  enterprise: "bg-violet-100 text-violet-800",
};

export type UserStatus = "active" | "disabled";

export const STATUS_OPTIONS: readonly UserStatus[] = ["active", "disabled"];

export const STATUS_LABELS_AR: Record<UserStatus, string> = {
  active: "مفعّل",
  disabled: "معطّل",
};

export type UserSortKey =
  | "created_at"
  | "last_seen_at"
  | "email"
  | "full_name"
  | "plan";

export interface UserListFilters {
  q?: string;
  plan?: Plan;
  country?: string;
  status?: UserStatus;
  from?: string;
  to?: string;
  sort?: UserSortKey;
  dir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface UserListRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  plan_expires_at: string | null;
  is_disabled: boolean;
  billing_country: string | null;
  created_at: string;
  last_seen_at: string | null;
  resume_count: number;
}

export interface UserListResult {
  rows: UserListRow[];
  total: number;
  page: number;
  perPage: number;
  countries: string[];
}

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;
export type UserPerPage = (typeof PER_PAGE_OPTIONS)[number];

export const DEFAULT_PER_PAGE: UserPerPage = 20;
