import { Crown, FileText, Palette, Settings, Share2, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Highlight pattern when on free plan (subscription only). */
  highlightFree?: boolean;
}

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "سيرتي", icon: FileText },
  { href: "/dashboard/templates", label: "التصاميم", icon: Palette },
  { href: "/dashboard/export", label: "تحميل ومشاركة", icon: Share2 },
  { href: "/subscription", label: "الاشتراك", icon: Crown, highlightFree: true },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];
