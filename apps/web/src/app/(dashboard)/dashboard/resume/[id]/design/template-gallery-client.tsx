"use client";

import { Crown, Eye, Moon, Palette, Sun } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@seerah/ui";

import {
  DEFAULT_PALETTE,
  RenderTemplate,
  TEMPLATE_REGISTRY,
  resolveTemplate,
  type TemplateId,
  type TemplateMeta,
} from "@/templates";
import type { LoadedResume } from "@/lib/editor/load-resume";
import type { TemplateMode } from "@/templates/types";
import { cn } from "@/lib/utils";

import { applyAccentColor, applyTemplate, applyThemeMode } from "./actions";

interface Props {
  data: LoadedResume;
  plan: "free" | "prime" | "enterprise";
}

type Status =
  | { kind: "idle" }
  | { kind: "applying"; templateId: TemplateId }
  | { kind: "preview"; templateId: TemplateId };

const PREVIEW_LANG_KEY = "seerah:design:preview-lang";

export function TemplateGalleryClient({ data, plan }: Props) {
  const isPrime = plan !== "free";
  const initialTheme =
    (data.resume.theme as { mode?: TemplateMode; primary_color?: string } | null) ?? null;

  const [activeTemplate, setActiveTemplate] = React.useState<TemplateId>(
    () => (resolveTemplate(data.resume.template_id).id) as TemplateId,
  );
  const [accent, setAccent] = React.useState<string | null>(
    initialTheme?.primary_color && /^#[0-9a-fA-F]{6}$/.test(initialTheme.primary_color)
      ? initialTheme.primary_color
      : null,
  );
  const [mode, setMode] = React.useState<TemplateMode>(initialTheme?.mode ?? "light");
  const [previewLang, setPreviewLang] = React.useState<"ar" | "en">("ar");
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const [upgradePrompt, setUpgradePrompt] = React.useState<TemplateMeta | null>(null);
  const [fullscreen, setFullscreen] = React.useState<TemplateMeta | null>(null);
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    const stored = window.localStorage.getItem(PREVIEW_LANG_KEY);
    if (stored === "ar" || stored === "en") setPreviewLang(stored);
  }, []);

  const onChooseTemplate = React.useCallback(
    (meta: TemplateMeta) => {
      if (meta.is_premium && !isPrime) {
        setUpgradePrompt(meta);
        return;
      }
      const previous = activeTemplate;
      setActiveTemplate(meta.id);
      setStatus({ kind: "applying", templateId: meta.id });
      startTransition(async () => {
        const res = await applyTemplate(data.resume.id, meta.id);
        setStatus({ kind: "idle" });
        if ("error" in res) {
          setActiveTemplate(previous);
          toast.error(res.error);
          return;
        }
        toast.success(`تم اختيار تصميم ${meta.name_ar}`);
      });
    },
    [activeTemplate, data.resume.id, isPrime, startTransition],
  );

  const onPickColor = React.useCallback(
    (color: string | null) => {
      const previous = accent;
      setAccent(color);
      startTransition(async () => {
        const res = await applyAccentColor(data.resume.id, color);
        if ("error" in res) {
          setAccent(previous);
          toast.error(res.error);
        }
      });
    },
    [accent, data.resume.id, startTransition],
  );

  const onToggleMode = React.useCallback(() => {
    const next: TemplateMode = mode === "light" ? "dark" : "light";
    const previous = mode;
    setMode(next);
    startTransition(async () => {
      const res = await applyThemeMode(data.resume.id, next);
      if ("error" in res) {
        setMode(previous);
        toast.error(res.error);
      }
    });
  }, [data.resume.id, mode, startTransition]);

  const onSwitchLang = (lang: "ar" | "en") => {
    setPreviewLang(lang);
    window.localStorage.setItem(PREVIEW_LANG_KEY, lang);
  };

  const previewMeta = resolveTemplate(activeTemplate);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_640px]">
      {/* Left: gallery */}
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">المجموعة</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Crown className="size-3.5 text-amber-500" />
            <span>التصاميم المدفوعة تتطلب اشتراك برايم</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_REGISTRY.map((meta) => (
            <TemplateCard
              key={meta.id}
              meta={meta}
              data={data}
              language={previewLang}
              theme={{ mode, primaryColor: accent ?? undefined }}
              isActive={activeTemplate === meta.id}
              isApplying={
                status.kind === "applying" && status.templateId === meta.id
              }
              isLocked={meta.is_premium && !isPrime}
              onChoose={() => onChooseTemplate(meta)}
              onPreview={() => setFullscreen(meta)}
            />
          ))}
        </div>
      </section>

      {/* Right: live preview + controls */}
      <aside className="sticky top-24 self-start space-y-4">
        <div className="rounded-card border bg-card p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{previewMeta.name_ar}</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMode}
                aria-label={mode === "light" ? "وضع داكن" : "وضع فاتح"}
              >
                {mode === "light" ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
              </Button>
              <div className="flex rounded-input border bg-background text-xs">
                <button
                  type="button"
                  className={cn(
                    "rounded-s-input px-2.5 py-1",
                    previewLang === "ar" ? "bg-accent text-accent-foreground" : "",
                  )}
                  onClick={() => onSwitchLang("ar")}
                >
                  عربي
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-e-input px-2.5 py-1",
                    previewLang === "en" ? "bg-accent text-accent-foreground" : "",
                  )}
                  onClick={() => onSwitchLang("en")}
                >
                  EN
                </button>
              </div>
            </div>
          </div>

          <ColorPicker activeColor={accent} onPick={onPickColor} />

          <div
            className="mt-3 max-h-[640px] overflow-auto rounded-md border bg-zinc-100 p-3 dark:bg-zinc-900"
          >
            <div
              style={{
                transform: "scale(0.55)",
                transformOrigin: "top left",
                width: "210mm",
              }}
            >
              <RenderTemplate
                templateId={activeTemplate}
                data={data}
                language={previewLang}
                theme={{ mode, primaryColor: accent ?? undefined }}
                isExport={false}
              />
            </div>
          </div>
        </div>
      </aside>

      <Dialog open={Boolean(fullscreen)} onOpenChange={(o) => !o && setFullscreen(null)}>
        <DialogContent className="max-w-[min(960px,95vw)]">
          <DialogHeader>
            <DialogTitle>{fullscreen?.name_ar ?? ""}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[78vh] overflow-auto rounded-md bg-zinc-100 p-3 dark:bg-zinc-900">
            {fullscreen ? (
              <div
                style={{
                  transform: "scale(0.85)",
                  transformOrigin: "top center",
                  width: "210mm",
                  margin: "0 auto",
                }}
              >
                <RenderTemplate
                  templateId={fullscreen.id}
                  data={data}
                  language={previewLang}
                  theme={{ mode, primaryColor: accent ?? undefined }}
                  isExport={false}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(upgradePrompt)} onOpenChange={(o) => !o && setUpgradePrompt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="size-5 text-amber-500" />
              فعّل برايم للوصول لهذا التصميم
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            تصميم {upgradePrompt?.name_ar} متاح للمشتركين في برايم. ترقية اشتراكك تفتح
            جميع التصاميم المدفوعة وتزيد حدّ السير في حسابك.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setUpgradePrompt(null)}>
              لاحقًا
            </Button>
            <Button asChild>
              <a href="/dashboard/billing">ترقية الآن</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TemplateCardProps {
  meta: TemplateMeta;
  data: LoadedResume;
  language: "ar" | "en";
  theme: { mode: TemplateMode; primaryColor?: string };
  isActive: boolean;
  isApplying: boolean;
  isLocked: boolean;
  onChoose: () => void;
  onPreview: () => void;
}

function TemplateCard({
  meta,
  data,
  language,
  theme,
  isActive,
  isApplying,
  isLocked,
  onChoose,
  onPreview,
}: TemplateCardProps) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-card border bg-card transition",
        isActive ? "ring-2 ring-accent" : "",
      )}
    >
      <button
        type="button"
        onClick={onPreview}
        className="relative aspect-[3/4] w-full overflow-hidden border-b bg-zinc-100 dark:bg-zinc-900"
        aria-label={`معاينة ${meta.name_ar}`}
      >
        <div
          aria-hidden
          // The thumbnail is the actual template at 0.20× scale — guaranteed
          // accurate, no PNGs to keep in sync. The fixed wrapper width makes
          // sure the inner A4 page maps cleanly to the card's aspect ratio.
          style={{
            transform: "scale(0.20)",
            transformOrigin: "top left",
            width: "210mm",
            position: "absolute",
            top: 0,
            insetInlineStart: 0,
            pointerEvents: "none",
          }}
        >
          <meta.Component
            data={data}
            language={language}
            theme={theme}
            isExport={false}
          />
        </div>
        {isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100">
            <Crown className="size-8" />
          </div>
        ) : null}
      </button>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{meta.name_ar}</p>
            <p className="text-xs text-muted-foreground">{meta.tagline_ar}</p>
          </div>
          {meta.is_premium ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Crown className="size-3" /> مدفوع
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              مجاني
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isActive ? "secondary" : "primary"}
            onClick={onChoose}
            disabled={isApplying || isActive}
          >
            {isActive ? "مُطبَّق" : isApplying ? "..." : "اختيار"}
          </Button>
          <Button size="sm" variant="outline" onClick={onPreview}>
            <Eye className="me-1 size-3.5" /> معاينة
          </Button>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  activeColor,
  onPick,
}: {
  activeColor: string | null;
  onPick: (color: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Palette className="size-4 text-muted-foreground" />
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          "size-6 rounded-full border-2 text-[10px]",
          activeColor === null ? "border-foreground" : "border-transparent",
        )}
        title="افتراضي"
        aria-label="افتراضي"
      >
        ◐
      </button>
      {DEFAULT_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onPick(color)}
          className={cn(
            "size-6 rounded-full border-2 transition",
            activeColor?.toLowerCase() === color.toLowerCase()
              ? "border-foreground scale-110"
              : "border-transparent",
          )}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
    </div>
  );
}
