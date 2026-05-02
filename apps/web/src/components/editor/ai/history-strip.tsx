"use client";

import { History, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@seerah/ui";

import type { HistoryEntry } from "@/lib/ai/history";
import { clearHistory, loadHistory } from "@/lib/ai/history";

interface Props {
  resumeId: string;
  scope: string;
  onSelect: (entry: HistoryEntry) => void;
  /** Bumps to force-reload after a new entry is written. */
  refreshKey?: number;
}

export function HistoryStrip({ resumeId, scope, onSelect, refreshKey }: Props) {
  const [items, setItems] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    setItems(loadHistory(resumeId, scope));
  }, [resumeId, scope, refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-2">
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <History className="size-3" />
          آخر {items.length} توليدات
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="مسح السجل"
          onClick={() => {
            clearHistory(resumeId, scope);
            setItems([]);
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <ul className="space-y-1">
        {items.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="line-clamp-2 w-full rounded-md px-2 py-1 text-start text-xs text-foreground/80 transition hover:bg-background"
              dir={entry.language === "en" ? "ltr" : "rtl"}
            >
              {entry.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
