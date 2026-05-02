"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface Props {
  resumeId: string;
}

interface Tab {
  href: (id: string) => string;
  label: string;
}

const TABS: readonly Tab[] = [
  { href: (id) => `/dashboard/resume/${id}`, label: "البيانات" },
  { href: (id) => `/dashboard/resume/${id}/design`, label: "التصميم" },
  { href: (id) => `/dashboard/resume/${id}/export`, label: "تحميل ومشاركة" },
] as const;

/**
 * Top-of-page tab bar shared between the resume editor, design picker, and
 * export pages. Each tab links to its own route — these are full pages
 * served by Next.js, not in-place tab content.
 */
export function ResumeTabs({ resumeId }: Props) {
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      className="mb-4 inline-flex gap-1 rounded-card border border-border bg-card p-1 shadow-soft"
    >
      {TABS.map((tab) => {
        const href = tab.href(resumeId);
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-input px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-accent text-accent-foreground shadow-soft"
                : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
