"use client";

import * as React from "react";

import { useEditor } from "../editor-context";
import { ChatThread } from "./chat-thread";
import type { RateLimitInfo } from "@/lib/ai/types";

interface Props {
  onRateLimit: (info: RateLimitInfo | null) => void;
}

/** Tab 4 — محادثة (SSE streaming, full resume context). */
export function ChatTab({ onRateLimit }: Props) {
  const { data, editorLang } = useEditor();

  const resumeContext = React.useMemo(
    () => ({
      title: data.resume.title,
      language: data.resume.language,
      personal: data.personal,
      education: data.education,
      experience: data.experience,
      courses: data.courses,
      skills: data.skills,
      projects: data.projects,
      references: data.references,
      languages: data.languages,
      links: data.links,
      hobbies: data.hobbies,
      address: data.address,
    }),
    [data],
  );

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col">
      <ChatThread resumeContext={resumeContext} language={editorLang} onRateLimit={onRateLimit} />
    </div>
  );
}
