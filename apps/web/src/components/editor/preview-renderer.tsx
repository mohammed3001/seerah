"use client";

import * as React from "react";

import type { LoadedResume } from "@/lib/editor/load-resume";
import { RenderTemplate } from "@/templates";
import type { TemplateMode } from "@/templates/types";

interface Props {
  data: LoadedResume;
  language: "ar" | "en";
}

/**
 * In-editor live preview. Reads the resume's `template_id` and `theme`
 * and delegates rendering to the template registry. The export route at
 * `/render/[id]` uses the same registry, so the preview is pixel-accurate.
 */
export function PreviewRenderer({ data, language }: Props) {
  const theme = (data.resume.theme as { mode?: TemplateMode; primary_color?: string } | null) ?? {
    mode: "light",
  };
  return (
    <RenderTemplate
      templateId={data.resume.template_id}
      data={data}
      language={language}
      theme={{ mode: theme.mode ?? "light", primaryColor: theme.primary_color }}
      isExport={false}
    />
  );
}
