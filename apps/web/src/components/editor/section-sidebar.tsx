"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@seerah/ui";

import { cn } from "@/lib/utils";
import { sections, type SectionKey } from "@/lib/editor/sections";

import { useEditor } from "./editor-context";

export function SectionSidebar() {
  const { activeSection, setActiveSection, data } = useEditor();
  const hidden = (data.resume.hidden_fields as string[]) ?? [];

  function isVisible(key: SectionKey): boolean {
    if (hidden.includes(key)) return false;
    const s = sections.find((x) => x.key === key);
    if (!s) return true;
    if (s.singleton) return true;
    const items =
      (data[key === "links" ? "links" : (key as keyof typeof data)] as
        | { is_visible: boolean }[]
        | undefined) ?? [];
    return items.some((i) => i.is_visible);
  }

  return (
    <nav className="space-y-1" aria-label="أقسام السيرة">
      {sections.map((section) => {
        const active = section.key === activeSection;
        const Icon = section.icon;
        const visible = isVisible(section.key);
        return (
          <Button
            key={section.key}
            type="button"
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-3 py-2 text-sm",
              active && "bg-accent/10 text-accent hover:bg-accent/15",
            )}
            onClick={() => setActiveSection(section.key)}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 text-start">{section.label}</span>
            {visible ? (
              <Eye className="size-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="size-3.5 text-muted-foreground/60" />
            )}
          </Button>
        );
      })}
    </nav>
  );
}
