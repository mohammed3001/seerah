"use client";

/**
 * 4-tab right-drawer AI assistant. Each tab calls a distinct AI service
 * endpoint and returns shaped data.
 *
 *  1. تحسين النص (enhance) — rewrite the focused field bilingually
 *  2. توليد تلقائي (generate) — generate structured section items from prose
 *  3. تحليل السيرة (analyze) — score + improvements + ATS + keywords
 *  4. محادثة (chat) — streaming SSE chat with full resume context
 *
 * The drawer is openable from per-field "✦ AI" buttons (which provide
 * `onAccept` callbacks for direct write-back) or from the section header
 * (which opens with the section pre-selected).
 */

import { Sparkles, X } from "lucide-react";
import * as React from "react";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@seerah/ui";

import { useEditor } from "./editor-context";
import { AnalyzeTab } from "./ai/analyze-tab";
import { ChatTab } from "./ai/chat-tab";
import { EnhanceTab } from "./ai/enhance-tab";
import { GenerateTab } from "./ai/generate-tab";
import { RateLimitBar } from "./ai/rate-limit-bar";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import type { RateLimitInfo } from "@/lib/ai/types";

export function AiPanel() {
  const { aiPanel, closeAiPanel, setAiPanelTab } = useEditor();
  const { profile } = useDashboardSession();
  const [rateLimit, setRateLimit] = React.useState<RateLimitInfo | null>(null);

  React.useEffect(() => {
    if (!aiPanel.open) setRateLimit(null);
  }, [aiPanel.open]);

  if (!aiPanel.open) return null;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
        onClick={closeAiPanel}
      />
      <aside
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-[400px] flex-col border-s border-border bg-background shadow-card-dark"
        style={{ animation: "slide-in-end 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        aria-label="مساعد الذكاء الاصطناعي"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">مساعد الذكاء الاصطناعي</p>
              <p className="text-xs text-muted-foreground">سيرة بالذكاء — gpt-4o-mini</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={closeAiPanel} aria-label="إغلاق">
            <X className="size-4" />
          </Button>
        </header>

        <Tabs
          value={aiPanel.tab}
          onValueChange={(v) => setAiPanelTab(v as "enhance" | "generate" | "analyze" | "chat")}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="m-3 grid grid-cols-4">
            <TabsTrigger value="enhance">تحسين</TabsTrigger>
            <TabsTrigger value="generate">توليد</TabsTrigger>
            <TabsTrigger value="analyze">تحليل</TabsTrigger>
            <TabsTrigger value="chat">محادثة</TabsTrigger>
          </TabsList>

          <RateLimitBar rateLimit={rateLimit} plan={profile.plan} className="mx-3" />

          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <TabsContent value="enhance" className="mt-3">
              <EnhanceTab onRateLimit={setRateLimit} />
            </TabsContent>
            <TabsContent value="generate" className="mt-3">
              <GenerateTab onRateLimit={setRateLimit} />
            </TabsContent>
            <TabsContent value="analyze" className="mt-3">
              <AnalyzeTab onRateLimit={setRateLimit} />
            </TabsContent>
            <TabsContent value="chat" className="mt-3 flex h-full flex-col">
              <ChatTab onRateLimit={setRateLimit} />
            </TabsContent>
          </div>
        </Tabs>
      </aside>
    </>
  );
}
