"use client";

import { Copy, RefreshCw, Sparkles, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Label, Textarea, ToggleGroup, ToggleGroupItem } from "@seerah/ui";

import { useEditor, type EditorLanguage } from "../editor-context";
import { HistoryStrip } from "./history-strip";
import { track } from "@/lib/analytics/posthog";
import { generateSectionAction } from "@/lib/ai/actions";
import { pushHistory } from "@/lib/ai/history";
import type {
  GenerateSectionResponse,
  RateLimitInfo,
  SectionType,
} from "@/lib/ai/types";

interface Props {
  onRateLimit: (info: RateLimitInfo | null) => void;
}

const SECTION_LABEL: Record<SectionType, string> = {
  education: "المؤهلات العلمية",
  experience: "الخبرة العملية",
  courses: "الدورات التدريبية",
  projects: "المشاريع",
  references: "المراجع",
  hobbies: "الهوايات",
  skills: "المهارات",
  languages: "اللغات",
  links: "الروابط",
  address: "العنوان",
};

const GENERATABLE: SectionType[] = [
  "education",
  "experience",
  "courses",
  "projects",
  "references",
  "hobbies",
  "skills",
  "languages",
  "links",
];

const SECTION_KEY_TO_TYPE: Record<string, SectionType> = {
  education: "education",
  experience: "experience",
  courses: "courses",
  projects: "projects",
  references: "references",
  hobbies: "hobbies",
  skills: "skills",
  languages: "languages",
  links: "links",
};

/** Tab 2 — توليد تلقائي */
export function GenerateTab({ onRateLimit }: Props) {
  const { aiPanel, data } = useEditor();
  const [language, setLanguage] = React.useState<EditorLanguage>("ar");
  const initialType: SectionType = aiPanel.section
    ? (SECTION_KEY_TO_TYPE[aiPanel.section] ?? "experience")
    : "experience";
  const [sectionType, setSectionType] = React.useState<SectionType>(initialType);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<GenerateSectionResponse | null>(null);
  const [historyTick, setHistoryTick] = React.useState(0);

  React.useEffect(() => {
    if (aiPanel.section) {
      const next = SECTION_KEY_TO_TYPE[aiPanel.section];
      if (next) setSectionType(next);
    }
  }, [aiPanel.section]);

  async function run() {
    if (!input.trim()) {
      toast.error("اكتب وصفًا أو سياقًا أولًا");
      return;
    }
    setLoading(true);
    try {
      const res = await generateSectionAction({
        section_type: sectionType,
        user_input_ar: language === "ar" ? input : null,
        user_input_en: language === "en" ? input : null,
        resume_context: { resume_title: data.resume.title },
        language,
      });
      if (!res.ok) {
        toast.error(res.error.message_ar);
        if ("rate_limit" in res.error && res.error.rate_limit) {
          onRateLimit(res.error.rate_limit);
        }
        return;
      }
      onRateLimit(res.rate_limit);
      track("ai_used", { endpoint: "generate_section", section_type: sectionType, language });
      setResult(res.data);
      pushHistory(data.resume.id, "generate", {
        text: res.data.explanation,
        language,
        meta: { section: sectionType, count: res.data.generated_items.length },
      });
      setHistoryTick((t) => t + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs text-muted-foreground">
          صف ما تريد بشكل عادي والمساعد سيستخرج بنود قسم منظَّم جاهز للإضافة.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="ai-gen-section">القسم</Label>
        <select
          id="ai-gen-section"
          value={sectionType}
          onChange={(e) => setSectionType(e.target.value as SectionType)}
          className="block h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {GENERATABLE.map((s) => (
            <option key={s} value={s}>
              {SECTION_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ai-gen-input">الوصف</Label>
        <Textarea
          id="ai-gen-input"
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            language === "ar"
              ? "مثال: درست هندسة الحاسب في جامعة الملك عبدالعزيز من 2018 إلى 2022"
              : "Example: I studied Computer Engineering at KAU from 2018 to 2022"
          }
          dir={language === "ar" ? "rtl" : "ltr"}
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
          {loading ? "جارٍ التوليد..." : result ? "إعادة توليد" : "ولّد بنود"}
        </Button>
      </div>

      {result ? (
        <div className="space-y-3">
          {result.explanation ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {result.explanation}
            </p>
          ) : null}
          <ul className="space-y-2">
            {result.generated_items.map((item, i) => (
              <GeneratedItemCard key={i} index={i + 1} item={item.data} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            بإمكانك نسخ القيم يدويًا إلى الحقول المناسبة في القسم.
            (قبول مباشر للبنود متعددة الأقسام سيُضاف لاحقًا.)
          </p>
        </div>
      ) : null}

      <HistoryStrip
        resumeId={data.resume.id}
        scope="generate"
        refreshKey={historyTick}
        onSelect={(entry) => {
          setInput(entry.text);
          setLanguage(entry.language);
        }}
      />
    </div>
  );
}

function GeneratedItemCard({
  index,
  item,
}: {
  index: number;
  item: Record<string, unknown>;
}) {
  const entries = Object.entries(item).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <li className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium">بند #{index}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={collapsed ? "عرض" : "إخفاء"}
          onClick={() => setCollapsed((c) => !c)}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {!collapsed ? (
        <dl className="space-y-1 px-3 py-2 text-xs">
          {entries.map(([k, v]) => {
            const display = renderValue(v);
            return (
              <div key={k} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 font-medium text-muted-foreground">{k}</dt>
                <dd className="flex items-center gap-1.5 text-end">
                  <span className="break-words">{display}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label="نسخ"
                    onClick={() => {
                      void navigator.clipboard.writeText(display);
                      toast.success("نُسخ");
                    }}
                  >
                    <Copy className="size-3" />
                  </Button>
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </li>
  );
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}
