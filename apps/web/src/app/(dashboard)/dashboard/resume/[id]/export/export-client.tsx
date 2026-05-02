"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Linkedin,
  Loader2,
  Mail,
  Send,
  Share2,
  Twitter,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import { toast } from "sonner";

import { Button, CircularProgress } from "@seerah/ui";

import { cn } from "@/lib/utils";

interface QuotaState {
  limit: number;
  remaining: number;
  reset_at: number;
  unlimited: boolean;
}

interface Props {
  resumeId: string;
  resumeTitle: string;
  completionScore: number;
  shareUrl: string;
  plan: "free" | "prime" | "enterprise";
  initialQuota: QuotaState | null;
}

type ExportFormat = "pdf_single" | "pdf_multi" | "png";

interface DownloadButton {
  format: ExportFormat;
  language: "ar" | "en";
  label: string;
  group: "pdf_multi" | "pdf_single" | "png";
}

const DOWNLOAD_BUTTONS: readonly DownloadButton[] = [
  { format: "png", language: "ar", label: "العربية", group: "png" },
  { format: "png", language: "en", label: "English", group: "png" },
  { format: "pdf_multi", language: "ar", label: "العربية", group: "pdf_multi" },
  { format: "pdf_multi", language: "en", label: "English", group: "pdf_multi" },
  { format: "pdf_single", language: "ar", label: "العربية", group: "pdf_single" },
  { format: "pdf_single", language: "en", label: "English", group: "pdf_single" },
] as const;

export function ExportClient({
  resumeId,
  resumeTitle,
  completionScore,
  shareUrl,
  plan,
  initialQuota,
}: Props) {
  const [quota, setQuota] = React.useState<QuotaState | null>(initialQuota);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const isUnlimited = plan !== "free" || (quota?.unlimited ?? false);

  const refreshQuota = React.useCallback(async () => {
    try {
      const res = await fetch("/api/export/quota", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        rate_limit: { limit: number; remaining: number; reset_at: number };
        unlimited: boolean;
      };
      setQuota({
        limit: data.rate_limit.limit,
        remaining: data.rate_limit.remaining,
        reset_at: data.rate_limit.reset_at,
        unlimited: data.unlimited,
      });
    } catch {
      // best-effort — don't toast
    }
  }, []);

  const triggerDownload = React.useCallback(
    async (format: ExportFormat, language: "ar" | "en") => {
      const key = `${format}-${language}`;
      setBusy(key);
      const endpoint = format === "png" ? "/api/export/png" : "/api/export/pdf";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_id: resumeId,
            language,
            format,
          }),
        });
        if (res.status === 429) {
          const body = await res.json().catch(() => null);
          toast.error("تجاوزت حدّ التصدير اليومي. ترقى إلى برايم للتصدير غير المحدود.");
          if (body?.rate_limit) {
            setQuota({
              limit: body.rate_limit.limit,
              remaining: body.rate_limit.remaining,
              reset_at: body.rate_limit.reset_at,
              unlimited: false,
            });
          }
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          toast.error("تعذّر إنشاء الملف الآن. حاول مرة أخرى." + (text ? ` (${res.status})` : ""));
          return;
        }
        const blob = await res.blob();
        const filename = parseFilename(res.headers.get("content-disposition")) ??
          fallbackFilename(resumeTitle, format, language);
        downloadBlob(blob, filename);
        // Update quota meter from response headers.
        const limit = res.headers.get("x-ratelimit-limit");
        const remaining = res.headers.get("x-ratelimit-remaining");
        const reset = res.headers.get("x-ratelimit-reset");
        if (limit && remaining && reset) {
          setQuota({
            limit: Number(limit),
            remaining: Number(remaining),
            reset_at: Number(reset),
            unlimited: isUnlimited,
          });
        } else {
          await refreshQuota();
        }
      } catch (cause) {
        toast.error(
          cause instanceof Error ? cause.message : "تعذّر إنشاء الملف الآن.",
        );
      } finally {
        setBusy(null);
      }
    },
    [isUnlimited, refreshQuota, resumeId, resumeTitle],
  );

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }, [shareUrl]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="flex items-center gap-4 rounded-card border bg-card p-4">
          <CircularProgress value={completionScore} size={72} strokeWidth={6} />
          <div>
            <p className="text-sm text-muted-foreground">اكتمال السيرة</p>
            <p className="text-lg font-semibold">{completionScore}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              زِد نسبة الاكتمال لتحسين فرص ظهورك في عمليات البحث
            </p>
          </div>
        </div>

        <div className="rounded-card border bg-card p-4">
          <h3 className="mb-3 font-semibold">تنزيل السيرة</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            اختر الصيغة واللغة المفضلتين. كل ملف يستخدم القالب والألوان المختارة في تبويب
            «التصميم».
          </p>

          <DownloadGroup
            title="صورة (PNG)"
            description="جودة شبكية ×٢ للنشر السريع"
            buttons={DOWNLOAD_BUTTONS.filter((b) => b.group === "png")}
            busy={busy}
            onDownload={triggerDownload}
          />
          <DownloadGroup
            title="PDF متعدد الصفحات"
            description="A4 — مناسب للطباعة"
            buttons={DOWNLOAD_BUTTONS.filter((b) => b.group === "pdf_multi")}
            busy={busy}
            onDownload={triggerDownload}
          />
          <DownloadGroup
            title="PDF صفحة واحدة"
            description="كل المحتوى على صفحة واحدة طويلة"
            buttons={DOWNLOAD_BUTTONS.filter((b) => b.group === "pdf_single")}
            busy={busy}
            onDownload={triggerDownload}
          />

          {!isUnlimited && quota ? (
            <div className="mt-4 rounded-input border bg-muted/40 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">الحصة اليومية</span>
                <span className="text-muted-foreground">
                  {quota.remaining}/{quota.limit} متبقّ
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-accent transition-all"
                  style={{
                    width: `${(quota.remaining / Math.max(1, quota.limit)) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-muted-foreground">
                {quota.remaining === 0
                  ? "بلغت الحدّ اليومي. ترقّ إلى برايم للتصدير غير المحدود."
                  : "ترقّ إلى برايم للحصول على تصدير غير محدود."}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-card border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Share2 className="size-4" /> رابط المشاركة
          </h3>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              dir="ltr"
              className="min-w-0 flex-1 rounded-input border bg-background px-2 py-1.5 text-xs"
            />
            <Button size="sm" variant="outline" onClick={onCopy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>

          <div className="mt-4 flex justify-center rounded-md border bg-white p-3">
            <QRCodeSVG value={shareUrl} size={144} includeMargin={false} />
          </div>

          <ShareGrid shareUrl={shareUrl} resumeTitle={resumeTitle} />
        </div>
      </aside>
    </div>
  );
}

function DownloadGroup({
  title,
  description,
  buttons,
  busy,
  onDownload,
}: {
  title: string;
  description: string;
  buttons: readonly DownloadButton[];
  busy: string | null;
  onDownload: (format: ExportFormat, language: "ar" | "en") => Promise<void>;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="flex gap-2">
        {buttons.map((b) => {
          const key = `${b.format}-${b.language}`;
          const isBusy = busy === key;
          return (
            <Button
              key={key}
              variant="outline"
              className="flex-1"
              disabled={isBusy || busy !== null}
              onClick={() => onDownload(b.format, b.language)}
            >
              {isBusy ? (
                <Loader2 className="me-2 size-4 animate-spin" />
              ) : (
                <Download className="me-2 size-4" />
              )}
              {b.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ShareGrid({ shareUrl, resumeTitle }: { shareUrl: string; resumeTitle: string }) {
  const text = `اطّلع على سيرتي الذاتية: ${resumeTitle}`;
  const enc = (v: string) => encodeURIComponent(v);
  const targets = [
    {
      label: "WhatsApp",
      icon: Send,
      href: `https://wa.me/?text=${enc(`${text} ${shareUrl}`)}`,
      colour: "bg-[#25D366]/10 text-[#25D366]",
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text)}`,
      colour: "bg-[#229ED9]/10 text-[#229ED9]",
    },
    {
      label: "Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl)}`,
      colour: "bg-[#1DA1F2]/10 text-[#1DA1F2]",
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      colour: "bg-[#1877F2]/10 text-[#1877F2]",
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
      colour: "bg-[#0A66C2]/10 text-[#0A66C2]",
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${enc(resumeTitle)}&body=${enc(`${text}\n${shareUrl}`)}`,
      colour: "bg-zinc-500/10 text-zinc-500",
    },
  ] as const;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex flex-col items-center gap-1 rounded-input border p-2 text-xs transition hover:bg-accent/10",
          )}
        >
          <span className={cn("flex size-7 items-center justify-center rounded-full", t.colour)}>
            <t.icon className="size-4" />
          </span>
          {t.label}
        </a>
      ))}
    </div>
  );
}

function parseFilename(value: string | null): string | null {
  if (!value) return null;
  const match = /filename="?([^";]+)"?/i.exec(value);
  return match?.[1] ?? null;
}

function fallbackFilename(title: string, format: ExportFormat, language: "ar" | "en"): string {
  const safe = title.replace(/[^a-zA-Z0-9_\u0600-\u06FF\-]+/g, "_").slice(0, 60) || "resume";
  const ext = format === "png" ? "png" : "pdf";
  return `${safe}_${language}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
