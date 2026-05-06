"use client";

/**
 * Floating chat widget. Appears as a 56×56 accent button in the bottom-right
 * (or bottom-left in RTL) corner of the editor and expands into a 380×500
 * panel anchored to the same corner. The thread shares the SSE proxy with
 * the in-drawer chat tab, so token usage / rate limits are unified.
 */

import { Maximize2, MessageCircle, Minimize2, X } from "lucide-react";
import * as React from "react";

import { Button } from "@seerah/ui";

import { ChatThread } from "./ai/chat-thread";
import { useEditor } from "./editor-context";

export function AiChatWidget() {
  const { data, editorLang, openAiPanel, aiPanel } = useEditor();
  const [open, setOpen] = React.useState(false);

  // Hide the floating button when the full drawer is already open on the
  // chat tab — there's no point in two chat surfaces stacked on top of each
  // other.
  if (aiPanel.open && aiPanel.tab === "chat") return null;

  const resumeContext = {
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
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-30 h-14 w-14 rounded-full shadow-card-dark"
        aria-label="فتح محادثة المساعد"
      >
        <MessageCircle className="size-6" />
      </Button>
    );
  }

  return (
    <aside
      className="fixed bottom-6 end-6 z-40 flex h-[500px] w-[380px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-border bg-background shadow-card-dark"
      aria-label="محادثة سيرة"
      style={{ animation: "slide-in-end 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent/10 text-accent">
            <MessageCircle className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">مساعد سيرة</p>
            <p className="text-[10px] text-muted-foreground">يعرف سيرتك بالكامل</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="فتح في الدرج الكامل"
            onClick={() => {
              setOpen(false);
              openAiPanel({ tab: "chat" });
            }}
          >
            <Maximize2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="تصغير"
            onClick={() => setOpen(false)}
          >
            <Minimize2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-3">
        <ChatThread resumeContext={resumeContext} language={editorLang} compact />
      </div>
    </aside>
  );
}
