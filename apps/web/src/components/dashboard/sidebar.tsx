"use client";

import { ChevronsLeft, ChevronsRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@seerah/ui";

import { cn } from "@/lib/utils";

import { dashboardNav } from "./nav-config";

interface SidebarProps {
  user: {
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    plan: "free" | "prime" | "enterprise";
  };
  onOpenSupport: () => void;
}

const STORAGE_KEY = "seerah:sidebar-collapsed";

export function DashboardSidebar({ user, onOpenSupport }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();
  const planLabel = user.plan === "free" ? "مجاني" : "برايم";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 border-e border-border bg-background transition-[width] duration-200 ease-out-soft md:flex md:flex-col",
        collapsed ? "w-[64px]" : "w-[240px]",
      )}
      data-collapsed={collapsed}
    >
      <div className="flex h-16 items-center justify-between px-3">
        {!collapsed ? (
          <Link href="/dashboard" className="font-cairo text-xl font-bold tracking-tight">
            سيرة
          </Link>
        ) : null}
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="طي القائمة الجانبية">
          {collapsed ? <ChevronsLeft className="size-5" /> : <ChevronsRight className="size-5" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-2 pt-2">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const highlight = item.highlightFree && user.plan === "free";

          const link = (
            <Link
              href={item.href}
              prefetch
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out-soft",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                highlight && !active && "text-amber-600 dark:text-amber-400",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="left">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.href}>{link}</div>;
        })}
      </nav>

      <div className="border-t border-border p-2 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
            collapsed && "justify-center",
          )}
          onClick={onOpenSupport}
        >
          <LifeBuoy className="size-5" />
          {!collapsed ? <span>الدعم الفني</span> : null}
        </Button>

        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="size-9">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName ?? "بدون اسم"}</p>
              <Badge variant={user.plan === "free" ? "default" : "gold"} className="mt-0.5">
                {planLabel}
                {user.plan !== "free" ? <span aria-hidden> 👑</span> : null}
              </Badge>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
