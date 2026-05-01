"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";

import { Button, ToggleGroup, ToggleGroupItem } from "@seerah/ui";

import { useEditor } from "./editor-context";
import { PreviewRenderer } from "./preview-renderer";

const ZOOM_OPTIONS: (0.5 | 0.75 | 1)[] = [0.5, 0.75, 1];
const DEBOUNCE_MS = 500;

export function PreviewPane() {
  const { data, previewLang, setPreviewLang, previewZoom, setPreviewZoom } = useEditor();
  const [debounced, setDebounced] = React.useState(data);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(data), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur">
        <ToggleGroup
          type="single"
          value={previewLang}
          onValueChange={(v) => v && setPreviewLang(v as "ar" | "en")}
        >
          <ToggleGroupItem value="ar">عربي</ToggleGroupItem>
          <ToggleGroupItem value="en">EN</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="تكبير"
            onClick={() => {
              const idx = ZOOM_OPTIONS.indexOf(previewZoom);
              if (idx < ZOOM_OPTIONS.length - 1) {
                const next = ZOOM_OPTIONS[idx + 1];
                if (next !== undefined) setPreviewZoom(next);
              }
            }}
          >
            <Plus className="size-4" />
          </Button>
          <span className="min-w-[3ch] text-center text-xs tabular-nums">
            {Math.round(previewZoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="تصغير"
            onClick={() => {
              const idx = ZOOM_OPTIONS.indexOf(previewZoom);
              if (idx > 0) {
                const next = ZOOM_OPTIONS[idx - 1];
                if (next !== undefined) setPreviewZoom(next);
              }
            }}
          >
            <Minus className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-zinc-100 p-6 dark:bg-zinc-900">
        <div
          style={{
            width: `${210 * previewZoom}mm`,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              transform: `scale(${previewZoom})`,
              transformOrigin: "top left",
              width: "210mm",
            }}
          >
            <PreviewRenderer data={debounced} language={previewLang} />
          </div>
        </div>
      </div>
    </div>
  );
}
