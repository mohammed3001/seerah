"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent, DialogTitle } from "@seerah/ui";

import { dashboardNav } from "./nav-config";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogTitle className="sr-only">لوحة الأوامر</DialogTitle>
        <Command label="أوامر" loop>
          <Command.Input
            placeholder="ابحث في القوائم والإعدادات…"
            className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-80 overflow-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              لا توجد نتائج
            </Command.Empty>
            <Command.Group heading="التنقل" className="text-xs text-muted-foreground">
              {dashboardNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => go(item.href)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                      "data-[selected=true]:bg-secondary data-[selected=true]:text-foreground",
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-foreground">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
