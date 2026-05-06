"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

import { ICON_MAP } from "./icon-map";
import type { NavSection } from "./nav-config";

interface SidebarProps {
  sections: NavSection[];
  adminEmail: string;
  adminRole: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مشرف عام",
  support_agent: "وكيل دعم",
  template_manager: "مدير قوالب",
};

export function Sidebar({ sections, adminEmail, adminRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-l border-slate-800 bg-[#0f172a] text-slate-200 lg:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#635BFF]/20 text-[#a5b4fc]">
          <span className="text-base font-bold">س</span>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Seerah</p>
          <p className="text-[11px] text-slate-400">لوحة الإدارة</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {sections.map((section) => {
          const Icon = ICON_MAP[section.iconKey];
          const active =
            section.href === "/"
              ? pathname === "/"
              : pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-[#635BFF]/15 text-white shadow-[inset_0_0_0_1px_rgba(99,91,255,0.35)]"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{section.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <p className="mb-1 truncate text-xs font-medium text-slate-200" dir="ltr">
          {adminEmail}
        </p>
        <p className="text-[11px] text-slate-500">{ROLE_LABELS[adminRole] ?? adminRole}</p>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="w-full rounded-md border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}
