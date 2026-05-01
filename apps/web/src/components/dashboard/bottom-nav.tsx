"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { dashboardNav } from "./nav-config";

export function DashboardBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-background/95 px-2 py-1 backdrop-blur-md md:hidden"
      aria-label="التنقل السفلي"
    >
      {dashboardNav.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[60px] flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[11px] transition-colors",
              active ? "text-accent" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            <span className="line-clamp-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
