"use client";

import { Bell, Search } from "lucide-react";

import { Button } from "@seerah/ui";

import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  onOpenSearch: () => void;
}

export function DashboardTopbar({ title, breadcrumb, onOpenSearch }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-[20px] saturate-[180%] md:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-cairo text-lg font-semibold">{title}</h1>
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav
            className="hidden text-xs text-muted-foreground md:flex md:gap-1.5"
            aria-label="مسار التنقل"
          >
            {breadcrumb.map((b, i) => (
              <span key={`${b.label}-${i}`}>
                {b.label}
                {i < breadcrumb.length - 1 ? (
                  <span className="mx-1 text-muted-foreground/40">/</span>
                ) : null}
              </span>
            ))}
          </nav>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden items-center gap-2 md:inline-flex"
        onClick={onOpenSearch}
      >
        <Search className="size-4" />
        <span className="text-muted-foreground">بحث…</span>
        <kbd className="ms-2 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] tracking-wider">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSearch}
        aria-label="بحث"
      >
        <Search className="size-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="الإشعارات">
        <Bell className="size-5" />
      </Button>
      <ThemeToggle />
    </header>
  );
}
