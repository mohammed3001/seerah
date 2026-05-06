"use client";

import { useState } from "react";

import { CommandPalette } from "./command-palette";
import { DashboardBottomNav } from "./bottom-nav";
import { DashboardSidebar } from "./sidebar";
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
  children: React.ReactNode;
}

export function DashboardShell({ user, title, breadcrumb, children }: ShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar user={user} onOpenSupport={() => setSupportOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          title={title}
          breadcrumb={breadcrumb}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
      <DashboardBottomNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
