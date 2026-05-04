import type { Tables } from "@seerah/types";

type AdminRole = Tables<"admin_users">["role"];

/**
 * Icon identifiers used by NAV_SECTIONS.  We pass strings (not lucide
 * component references) so the nav config can be sent from a Server
 * Component to a Client Component — Next.js refuses to serialize
 * function-shaped React components across that boundary.  The client
 * sidebar/mobile nav resolve the key back to a lucide icon via
 * `ICON_MAP` in `./icon-map.ts`.
 */
export type NavIconKey =
  | "dashboard"
  | "users"
  | "resumes"
  | "templates"
  | "subscriptions"
  | "support"
  | "ai"
  | "audit"
  | "settings";

export interface NavSection {
  href: string;
  label: string;
  iconKey: NavIconKey;
  /** Roles that may see this section.  Empty = all roles. */
  roles: readonly AdminRole[];
}

/**
 * Single source of truth for the sidebar order + role-gating.  Pages must
 * also re-check the role server-side; this list controls only the UI.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    href: "/",
    label: "لوحة التحكم",
    iconKey: "dashboard",
    roles: [],
  },
  {
    href: "/users",
    label: "المستخدمون",
    iconKey: "users",
    roles: ["super_admin", "support_agent"],
  },
  {
    href: "/resumes",
    label: "السير الذاتية",
    iconKey: "resumes",
    roles: ["super_admin", "template_manager"],
  },
  {
    href: "/templates",
    label: "القوالب",
    iconKey: "templates",
    roles: ["super_admin", "template_manager"],
  },
  {
    href: "/subscriptions",
    label: "الاشتراكات",
    iconKey: "subscriptions",
    roles: ["super_admin"],
  },
  {
    href: "/support",
    label: "الدعم الفني",
    iconKey: "support",
    roles: ["super_admin", "support_agent"],
  },
  {
    href: "/ai",
    label: "الذكاء الاصطناعي",
    iconKey: "ai",
    roles: ["super_admin"],
  },
  {
    href: "/audit",
    label: "سجل المراجعة",
    iconKey: "audit",
    roles: ["super_admin"],
  },
  {
    href: "/settings",
    label: "الإعدادات",
    iconKey: "settings",
    roles: ["super_admin"],
  },
];

export function visibleSections(role: AdminRole): NavSection[] {
  return NAV_SECTIONS.filter((s) => s.roles.length === 0 || s.roles.includes(role));
}
