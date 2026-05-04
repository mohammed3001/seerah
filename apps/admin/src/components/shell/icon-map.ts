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

import type { NavIconKey } from "./nav-config";

/**
 * Resolves a serialisable `iconKey` (string) back to its lucide icon
 * component.  Used by the client sidebar / mobile nav since we cannot
 * pass component references across the RSC boundary.
 */
export const ICON_MAP: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  resumes: FileText,
  templates: Sparkles,
  subscriptions: CreditCard,
  support: LifeBuoy,
  ai: Bot,
  audit: BarChart3,
  settings: Settings,
};
