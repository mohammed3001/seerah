import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import type { Tables } from "@seerah/types";

type AdminRole = Tables<"admin_users">["role"];

export interface NavSection {
  href: string;
  label: string;
  icon: LucideIcon;
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
    icon: LayoutDashboard,
    roles: [],
  },
  {
    href: "/users",
    label: "المستخدمون",
    icon: Users,
    roles: ["super_admin", "support_agent"],
  },
  {
    href: "/resumes",
    label: "السير الذاتية",
    icon: FileText,
    roles: ["super_admin", "template_manager"],
  },
  {
    href: "/templates",
    label: "القوالب",
    icon: Sparkles,
    roles: ["super_admin", "template_manager"],
  },
  {
    href: "/subscriptions",
    label: "الاشتراكات",
    icon: CreditCard,
    roles: ["super_admin"],
  },
  {
    href: "/support",
    label: "الدعم الفني",
    icon: LifeBuoy,
    roles: ["super_admin", "support_agent"],
  },
  {
    href: "/ai",
    label: "الذكاء الاصطناعي",
    icon: Bot,
    roles: ["super_admin"],
  },
  {
    href: "/audit",
    label: "سجل المراجعة",
    icon: BarChart3,
    roles: ["super_admin"],
  },
  {
    href: "/settings",
    label: "الإعدادات",
    icon: Settings,
    roles: ["super_admin"],
  },
];

export function visibleSections(role: AdminRole): NavSection[] {
  return NAV_SECTIONS.filter((s) => s.roles.length === 0 || s.roles.includes(role));
}
