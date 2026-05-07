"use client";

import { useState } from "react";

import { CommandPalette } from "./command-palette";
import { FloatingNav } from "./floating-nav";
import { DashboardTopbar } from "./topbar";
import { SupportDialog } from "./support-dialog";

interface ShellProps {
  user: {
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    plan: "free" | "prime" | "enterprise";
  };
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  /**
   * When true, the main content stretches to the full viewport width with a
   * minimal horizontal gutter — used by the resume editor where the form +
   * preview split-pane needs every available pixel.  When false (default), the
   * content is centered inside a 1200px max-width column for readability on
   * card / table / settings pages.
   */
  fullBleed?: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  title,
  breadcrumb,
  fullBleed = false,
  children,
}: ShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardTopbar
        title={title}
        breadcrumb={breadcrumb}
        onOpenSearch={() => setSearchOpen(true)}
      />
      {/*
        pb-28 reserves space for the floating bottom nav (~64px) plus a
        comfortable margin so the bar never overlaps interactive content.
      */}
      <main className="flex-1 px-4 pb-28 pt-6 md:px-6 lg:px-8">
        {fullBleed ? (
          <div className="w-full">{children}</div>
        ) : (
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        )}
      </main>
      <FloatingNav user={user} onOpenSupport={() => setSupportOpen(true)} />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
