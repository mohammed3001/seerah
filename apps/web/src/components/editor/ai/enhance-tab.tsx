"use client";

import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Label, Textarea, ToggleGroup, ToggleGroupItem } from "@seerah/ui";

import { useEditor, type EditorLanguage } from "../editor-context";
import { HistoryStrip } from "./history-strip";
import { enhanceTextAction } from "@/lib/ai/actions";
import { pushHistory } from "@/lib/ai/history";
import type { EnhanceFieldType, RateLimitInfo } from "@/lib/ai/types";

interface Props {
  onRateLimit: (info: RateLimitInfo | null) => void;
}

const FIELD_LABEL: Record<EnhanceFieldType, string> = {
  bio: "النبذة المختصرة",
  job_title: "المسمى الوظيفي",
  education_description: "وصف المؤهل",
  experience_description: "وصف الخبرة",
  course_description: "وصف الدورة",
  project_description: "وصف المشروع",
  reference_description: "وصف المرجع",
  hobby: "الهواية",
};

/** Tab 1 — تحسين النص */
export function EnhanceTab({ onRateLimit }: Props) {
  const { aiPanel, data, closeAiPanel } = useEditor();
  const [language, setLanguage] = React.useState<EditorLanguage>("ar");
  const [currentText, setCurrentText] = React.useState(aiPanel.currentText ?? "");
  const [context, setContext] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ ar: string; en: string; suggestions: string[] } | null>(null);
  const [historyTick, setHistoryTick] = React.useState(0);

  React.useEffect(() => {
    setCurrentText(aiPanel.currentText ?? "");
    setResult(null);
  }, [aiPanel.currentText, aiPanel.field, aiPanel.section]);

  const fieldType = aiPanel.fieldType ?? "bio";

  async function run() {
    if (!currentText.trim() && !context.trim()) {
      toast.error("اكتب نصًا حاليًا أو وصفًا للسياق أولًا");
      return;
    }
    setLoading(true);
    try {
      const res = await enhanceTextAction({
        field_type: fieldType,
        current_text: currentText,
        context: context || null,
        language,
        resume_context: { resume: data.resume.title },
      });
      if (!res.ok) {
        toast.error(res.error.message_ar);
        if (res.status === 429) onRateLimit(null);
        return;
      }
      onRateLimit(res.rate_limit);
      setResult({
        ar: res.data.enhanced_ar,
        en: res.data.enhanced_en,
        suggestions: res.data.suggestions,
      });
      pushHistory(data.resume.id, "enhance", {
        text: language === "ar" ? res.data.enhanced_ar : res.data.enhanced_en,
        language,
        meta: { field: fieldType },
      });
      setHistoryTick((t) => t + 1);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("نُسخ إلى الحافظة");
  }

  function accept(text: string, lang: EditorLanguage) {
    if (aiPanel.onAccept) {
      aiPanel.onAccept(text, lang);
      toast.success("تم تطبيق النص في الحقل");
      closeAiPanel();
    } else {
      copy(text);
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">حقل: {FIELD_LABEL[fieldType]}</p>
        <p className="text-xs text-muted-foreground">
          سيُعيد المساعد كتابة النص بأسلوب احترافي بالعربية الفصحى والإنجليزية المتوافقة مع ATS.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="ai-enhance-current">النص الحالي</Label>
        <Textarea
          id="ai-enhance-current"
          rows={4}
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          placeholder="ألصق النص أو اكتب فكرة أولية"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-enhance-context">سياق إضافي (اختياري)</Label>
        <Textarea
          id="ai-enhance-context"
          rows={2}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="مثال: أبحث عن وظيفة Senior Backend في شركة سعودية"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          value={language}
          onValueChange={(v) => v && setLanguage(v as EditorLanguage)}
        >
          <ToggleGroupItem value="ar">عربي</ToggleGroupItem>
          <ToggleGroupItem value="en">English</ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={run} disabled={loading} size="sm" className="gap-2">
          {loading ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {loading ? "جارٍ التحسين..." : result ? "إعادة توليد" : "حسّن النص"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-3">
          <ResultCard
            title="العربية"
            text={result.ar}
            dir="rtl"
            onCopy={() => copy(result.ar)}
            onAccept={() => accept(result.ar, "ar")}
            canAccept={Boolean(aiPanel.onAccept)}
          />
          <ResultCard
            title="English"
            text={result.en}
            dir="ltr"
            onCopy={() => copy(result.en)}
            onAccept={() => accept(result.en, "en")}
            canAccept={Boolean(aiPanel.onAccept)}
          />
          {result.suggestions.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-medium">اقتراحات تحسين</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {result.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <HistoryStrip
        resumeId={data.resume.id}
        scope="enhance"
        refreshKey={historyTick}
        onSelect={(entry) => {
          setResult({ ar: entry.text, en: entry.text, suggestions: [] });
          setLanguage(entry.language);
        }}
      />
    </div>
  );
}

function ResultCard({
  title,
  text,
  dir,
  onCopy,
  onAccept,
  canAccept,
}: {
  title: string;
  text: string;
  dir: "ltr" | "rtl";
  onCopy: () => void;
  onAccept: () => void;
  canAccept: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium">{title}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={onCopy} aria-label="نسخ">
            <Copy className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="px-3 py-2 text-sm leading-relaxed" dir={dir}>
        {text}
      </p>
      <div className="border-t border-border px-3 py-1.5 text-end">
        <Button size="sm" variant="primary" className="gap-1.5" onClick={onAccept}>
          <Check className="size-3.5" />
          {canAccept ? "قبول وتطبيق" : "نسخ النص"}
        </Button>
      </div>
    </div>
  );
}
