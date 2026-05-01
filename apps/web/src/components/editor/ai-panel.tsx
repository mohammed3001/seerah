"use client";

import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Label, Textarea, ToggleGroup, ToggleGroupItem } from "@seerah/ui";

import { useEditor } from "@/components/editor/editor-context";
import { aiGenerate, type AiGenerateResponse } from "@/lib/editor/ai-client";
import { sectionByKey } from "@/lib/editor/sections";

export function AiPanel() {
  const { aiPanel, closeAiPanel, editorLang } = useEditor();
  const [prompt, setPrompt] = React.useState("");
  const [language, setLanguage] = React.useState<"ar" | "en">(editorLang);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AiGenerateResponse | null>(null);

  React.useEffect(() => {
    if (!aiPanel.open) {
      setPrompt("");
      setResult(null);
    }
  }, [aiPanel.open]);

  if (!aiPanel.open || !aiPanel.section) return null;
  const section = sectionByKey[aiPanel.section];

  async function generate() {
    if (!prompt.trim()) {
      toast.error("اكتب وصفًا للذكاء الاصطناعي");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await aiGenerate({
        section: section.key,
        field: aiPanel.field,
        prompt: prompt.trim(),
        language,
      });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الاتصال بخدمة الذكاء الاصطناعي");
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    if (!result) return;
    // Copy generated text to clipboard for now — section editors handle their
    // own field assignment via the open AI panel context. Future iteration:
    // wire a dispatch event keyed on aiPanel.field.
    void navigator.clipboard?.writeText(result.text).catch(() => {});
    toast.success("تم نسخ النص — الصقه في الحقل المطلوب");
    closeAiPanel();
  }

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
        onClick={closeAiPanel}
      />
      <aside
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-border bg-background shadow-card-dark"
        style={{ animation: "slide-in-end 220ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">الكتابة بالذكاء الاصطناعي</p>
              <p className="text-xs text-muted-foreground">{section.label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={closeAiPanel} aria-label="إغلاق">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label>صف بإيجاز ما تريد كتابته</Label>
            <Textarea
              rows={4}
              placeholder={
                section.key === "personal"
                  ? "مثال: مهندس برمجيات بخبرة 5 سنوات في React وNode.js…"
                  : "اكتب وصفًا واضحًا حتى ينتج نتائج أدق"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>لغة الإخراج</Label>
            <ToggleGroup type="single" value={language} onValueChange={(v) => v && setLanguage(v as "ar" | "en")}>
              <ToggleGroupItem value="ar">العربية</ToggleGroupItem>
              <ToggleGroupItem value="en">English</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button type="button" onClick={() => void generate()} disabled={loading} size="lg" className="w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            توليد النص
          </Button>

          {result ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>النتيجة</Label>
                {typeof result.tokens === "number" ? (
                  <span className="text-[11px] text-muted-foreground">
                    رموز مستخدمة: {result.tokens}
                  </span>
                ) : null}
              </div>
              <Textarea
                rows={10}
                value={result.text}
                onChange={(e) => setResult({ ...result, text: e.target.value })}
                dir={result.language === "ar" ? "rtl" : "ltr"}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void generate()} disabled={loading}>
                  <RefreshCw className="size-4" />
                  إعادة توليد
                </Button>
                <Button onClick={accept}>قبول ونسخ</Button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
