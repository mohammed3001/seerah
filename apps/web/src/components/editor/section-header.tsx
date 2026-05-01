"use client";

import { Sparkles } from "lucide-react";

import { Button, ToggleGroup, ToggleGroupItem } from "@seerah/ui";

import { useEditor, type EditorLanguage } from "./editor-context";
import type { SectionKey } from "@/lib/editor/sections";

interface Props {
  section: SectionKey;
  title: string;
  description?: string;
  showAi?: boolean;
}

export function SectionHeader({ section, title, description, showAi = true }: Props) {
  const { editorLang, setEditorLang, openAiPanel } = useEditor();
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h2 className="font-cairo text-xl font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={editorLang}
          onValueChange={(v) => v && setEditorLang(v as EditorLanguage)}
        >
          <ToggleGroupItem value="ar">العربية</ToggleGroupItem>
          <ToggleGroupItem value="en">English</ToggleGroupItem>
        </ToggleGroup>
        {showAi ? (
          <Button
            variant="outline"
            size="sm"
            className="border-accent/40 text-accent hover:bg-accent/5"
            onClick={() => openAiPanel(section)}
          >
            <Sparkles className="size-4" />
            اكتب بالذكاء الاصطناعي
          </Button>
        ) : null}
      </div>
    </div>
  );
}
