"use client";

import { Sparkles, RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  CircularProgress,
  Progress,
  ToggleGroup,
  ToggleGroupItem,
} from "@seerah/ui";

import { useEditor, type EditorLanguage } from "../editor-context";
import { analyzeResumeAction } from "@/lib/ai/actions";
import type { AnalyzeResumeResponse, RateLimitInfo } from "@/lib/ai/types";

interface Props {
  onRateLimit: (info: RateLimitInfo | null) => void;
}

/** Tab 3 — تحليل السيرة */
export function AnalyzeTab({ onRateLimit }: Props) {
  const { data } = useEditor();
  const [language, setLanguage] = React.useState<EditorLanguage>("ar");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AnalyzeResumeResponse | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await analyzeResumeAction({
        resume_data: serializeResume(data),
        language,
      });
      if (!res.ok) {
        toast.error(res.error.message_ar);
        return;
      }
      onRateLimit(res.rate_limit);
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs text-muted-foreground">
          سيُحلّل المساعد سيرتك ويعطيك نقاط القوة والتحسين بالإضافة إلى تقييم ATS.
        </p>
      </header>

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
          {loading ? "جارٍ التحليل..." : result ? "إعادة تحليل" : "حلّل السيرة"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard title="الدرجة الإجمالية" score={result.overall_score} />
            <ScoreCard title="ATS" score={result.ats_score} />
          </div>

          {result.strengths.length > 0 ? (
            <Section title="نقاط القوة" tone="positive">
              <ul className="space-y-1 text-sm">
                {result.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {result.improvements.length > 0 ? (
            <Section title="فرص التحسين" tone="warning">
              <ul className="space-y-1 text-sm">
                {result.improvements.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {result.completion_tips.length > 0 ? (
            <Section title="نصائح لإكمال السيرة" tone="neutral">
              <ul className="space-y-2 text-sm">
                {result.completion_tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Badge
                      variant={
                        t.severity === "critical"
                          ? "destructive"
                          : t.severity === "warning"
                            ? "default"
                            : "outline"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {t.section}
                    </Badge>
                    <span>{t.message}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {result.keyword_suggestions.length > 0 ? (
            <Section title="كلمات مفتاحية مقترحة" tone="neutral">
              <div className="flex flex-wrap gap-1.5">
                {result.keyword_suggestions.map((k, i) => (
                  <Badge key={i} variant="outline" className="font-normal">
                    {k}
                  </Badge>
                ))}
              </div>
            </Section>
          ) : null}

          {result.industry_insights ? (
            <Section title="ملاحظات حسب القطاع" tone="neutral">
              <p className="text-sm text-muted-foreground">{result.industry_insights}</p>
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({ title, score }: { title: string; score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <CircularProgress value={clamped} size={48} strokeWidth={4} />
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold tabular-nums">{clamped}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "positive" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/5"
        : "border-border bg-muted/40";
  return (
    <div className={`rounded-lg border ${toneClasses} p-3`}>
      <p className="mb-2 text-xs font-semibold">{title}</p>
      {children}
    </div>
  );
}

interface ResumeBundle {
  resume: { id: string; title: string; language: string };
  personal: unknown;
  education: unknown[];
  experience: unknown[];
  courses: unknown[];
  skills: unknown[];
  projects: unknown[];
  references: unknown[];
  languages: unknown[];
  links: unknown[];
  hobbies: unknown[];
  address: unknown;
}

function serializeResume(data: ResumeBundle): Record<string, unknown> {
  return {
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
}
