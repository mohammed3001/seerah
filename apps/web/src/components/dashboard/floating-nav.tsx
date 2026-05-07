"use client";

import { LifeBuoy, LogOut, PanelBottomClose, PanelBottomOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@seerah/ui";

import { cn } from "@/lib/utils";

import { dashboardNav } from "./nav-config";

interface FloatingNavProps {
  user: {
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    plan: "free" | "prime" | "enterprise";
  };
  onOpenSupport: () => void;
}

const STORAGE_KEY = "seerah:nav-expanded";

/**
 * Floating, pill-shaped navigation that lives at the bottom of the viewport
 * and replaces the sidebar + bottom-nav split.  On `md+` viewports the user
 * can toggle between an icon-only "compact" mode and an expanded mode that
 * also shows the labels for each nav item.  On smaller screens we always
 * render the compact form (no toggle) so the bar stays within the viewport.
 *
 * RTL-safe: positioning uses logical centering (`left:50% + translate-x:-50%`),
 * which is unaffected by writing direction.  The flex-row inside flips
 * naturally with `dir="rtl"` so the visual order matches the document.
 */
export function FloatingNav({ user, onOpenSupport }: FloatingNavProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    else if (stored === "false") setExpanded(false);
    else setExpanded(window.matchMedia("(min-width: 768px)").matches);
    setHydrated(true);
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  const initials = (user.fullName ?? user.email).slice(0, 2).toUpperCase();
  const planLabel = user.plan === "free" ? "مجاني" : "برايم";

  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="التنقل الرئيسي"
        data-expanded={expanded}
        className={cn(
          "fixed bottom-4 left-1/2 z-30 -translate-x-1/2",
          "flex max-w-[calc(100vw-1rem)] items-center gap-1",
          "rounded-full border border-border bg-background/95 px-2 py-1.5",
          "shadow-prominent backdrop-blur-md backdrop-saturate-150",
          // Items that only render on md+ are hidden on small screens via
          // their own `hidden md:flex` classes; the bar itself stays
          // visible across breakpoints.
          "transition-[max-width,padding] duration-200 ease-out-soft",
          // Avoid initial flash before hydration computes the right state
          // on small screens.
          !hydrated && "opacity-0",
          hydrated && "opacity-100",
        )}
      >
        <ul className="flex items-stretch gap-1" role="list">
          {dashboardNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const highlight = item.highlightFree && user.plan === "free";

            const showLabel = expanded;

            const link = (
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  "min-h-[40px]",
                  active
                    ? "bg-accent text-accent-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  highlight && !active && "text-warning",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span
                  className={cn(
                    "whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out-soft",
                    showLabel
                      ? "max-w-[140px] opacity-100"
                      : "max-w-0 overflow-hidden opacity-0 ms-0",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            return (
              <li key={item.href}>
                {showLabel ? (
                  link
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="top">{item.label}</TooltipContent>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>

        <span aria-hidden className="mx-1 hidden h-6 w-px bg-border md:block" />

        <div className="hidden items-center gap-1 md:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onOpenSupport}
                aria-label="الدعم الفني"
              >
                <LifeBuoy className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">الدعم الفني</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-1 py-1 text-sm transition hover:bg-accent/10"
                aria-label="حساب المستخدم"
              >
                <Avatar className="size-8">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {expanded ? (
                  <Badge variant={user.plan === "free" ? "default" : "gold"} className="me-1">
                    {planLabel}
                    {user.plan !== "free" ? <span aria-hidden> 👑</span> : null}
                  </Badge>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={12}>
              <DropdownMenuLabel className="space-y-0.5">
                <div className="truncate text-sm font-medium">{user.fullName ?? "بدون اسم"}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                <Badge variant={user.plan === "free" ? "default" : "gold"} className="mt-1">
                  {planLabel}
                  {user.plan !== "free" ? <span aria-hidden> 👑</span> : null}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">الإعدادات</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/subscription">الاشتراك</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/auth/sign-out" method="POST" className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2 text-destructive">
                    <LogOut className="size-4" />
                    تسجيل الخروج
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={toggle}
                aria-label={expanded ? "طيّ شريط التنقل" : "توسيع شريط التنقل"}
                aria-pressed={expanded}
              >
                {expanded ? (
                  <PanelBottomClose className="size-5" />
                ) : (
                  <PanelBottomOpen className="size-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {expanded ? "طيّ شريط التنقل" : "توسيع شريط التنقل"}
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
