"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

import type { NavSection } from "./nav-config";

interface MobileNavProps {
  sections: NavSection[];
  adminEmail: string;
}

export function MobileNav({ sections, adminEmail }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever the route changes (e.g. after a click).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/60"
            aria-label="إغلاق القائمة"
          />

          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-slate-800 bg-[#0f172a] text-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-semibold text-white">قائمة الإدارة</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3">
              {sections.map((section) => {
                const Icon = section.icon;
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
                        ? "bg-[#635BFF]/15 text-white"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{section.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 px-5 py-4">
              <p className="truncate text-xs text-slate-300" dir="ltr">
                {adminEmail}
              </p>
              <form action="/api/auth/logout" method="post" className="mt-3">
                <button
                  type="submit"
                  className="w-full rounded-md border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  تسجيل الخروج
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
