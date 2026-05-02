"use client";

/**
 * <UpgradeModal>
 *
 * Shared upgrade prompt used wherever a free user hits a prime gate. Pass a
 * `feature` to pick the headline/copy and an optional `previewImage` for a
 * blurred preview (e.g. premium-template card).
 *
 * Calls `/api/stripe/checkout` directly when the user clicks the CTA so the
 * caller doesn't have to duplicate that logic.
 */

import { Check, Crown, Loader2, X as XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@seerah/ui";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { pickCurrencyForCountry } from "@/lib/billing/currency";

export type UpgradeFeature =
  | "templateLock"
  | "slugCustomization"
  | "resumeLimit"
  | "aiLimit"
  | "exportLimit"
  | "passwordProtection"
  | "customSection"
  | "watermark";

interface FeatureCopy {
  title: string;
  description: string;
  highlights: readonly string[];
}

const COPY: Record<UpgradeFeature, FeatureCopy> = {
  templateLock: {
    title: "هذا التصميم متاح لمشتركي برايم",
    description: "افتح الوصول لكل القوالب المميزة الحالية والمستقبلية.",
    highlights: [
      "10+ قوالب مميزة بألوان وتدرّجات احترافية",
      "تحديثات تصميم جديدة شهريًا",
      "تخصيص الألوان لكل قالب",
    ],
  },
  slugCustomization: {
    title: "خصِّص رابط سيرتك الذاتية",
    description: "اختر اسم رابطك بدلًا من المعرّف العشوائي.",
    highlights: [
      "رابط مثل seerah.com/cv/your-name",
      "أسهل للمشاركة على LinkedIn والإيميل",
      "يبقى نفس الرابط حتى لو غيّرت تصميمك",
    ],
  },
  resumeLimit: {
    title: "أنشِئ حتى 5 سير ذاتية",
    description: "سيرة لكل مجال أو وظيفة — كلها بحسابٍ واحد.",
    highlights: [
      "5 سير ذاتية مع تصاميم مختلفة",
      "نسخ وتعديل سهل بين السير",
      "إحصائيات مستقلة لكل سيرة",
    ],
  },
  aiLimit: {
    title: "ذكاء اصطناعي بلا حدود عملية",
    description: "100 طلب يوميًا بدلاً من 5 — كافٍ لتحسين سيرتك بالكامل.",
    highlights: [
      "تحسين النصوص باللغتين العربية والإنجليزية",
      "اقتراح المهارات والكلمات المفتاحية",
      "تحليل التوافق مع وصف الوظيفة",
    ],
  },
  exportLimit: {
    title: "تصدير غير محدود",
    description: "حمّل سيرتك بصيغة PDF أو PNG كم مرة تريد.",
    highlights: [
      "بدون علامة مائية",
      "PDF صفحة واحدة أو متعددة",
      "PNG بدقة عالية للمنصات الاجتماعية",
    ],
  },
  passwordProtection: {
    title: "احمِ سيرتك بكلمة مرور",
    description: "شارك الرابط مع من تثق بهم فقط.",
    highlights: [
      "كلمة مرور مخصصة لكل سيرة",
      "إخفاء السيرة من نتائج البحث",
      "تتبع زيارات الرابط",
    ],
  },
  customSection: {
    title: "أقسام مخصصة لاحتياجاتك",
    description: "أضِف أقسامًا خاصة كالمؤتمرات والعضويات والعمل التطوعي.",
    highlights: [
      "حتى 5 أقسام مخصصة",
      "اختر اسم القسم بالعربية والإنجليزية",
      "أعد ترتيبها مثل بقية الأقسام",
    ],
  },
  watermark: {
    title: "تصدير بدون علامة مائية",
    description: "ملفاتك الاحترافية تستحق ظهورًا نظيفًا بدون شعارنا.",
    highlights: [
      "PDF نظيف بدون أي إشارة لـSeerah",
      "أنسب لإرسال السيرة للشركات",
      "PNG بدون تذييل",
    ],
  },
};

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: UpgradeFeature;
  previewImage?: string | null;
  /** Currency override for the checkout — auto-detected from country if omitted. */
  currency?: "sar" | "usd";
}

// Kept in sync with PRIME_PLAN in @/lib/stripe/server. Inlined here so the
// browser bundle doesn't pull a server-only module.
const PRICE_BY_CURRENCY = {
  sar: { yearly: 149, label_yearly: "149 ر.س", label_monthly: "12.4 ر.س" },
  usd: { yearly: 39, label_yearly: "$39", label_monthly: "≈ $3.25" },
} as const;

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  previewImage,
  currency,
}: UpgradeModalProps) {
  const [loading, setLoading] = React.useState(false);
  const copy = COPY[feature];
  const session = useDashboardSession();
  // Currency precedence: explicit prop > profile.billing_country > USD default.
  const resolvedCurrency =
    currency ?? pickCurrencyForCountry(session.profile.billing_country);
  const pricing = PRICE_BY_CURRENCY[resolvedCurrency];
  const priceLabel = pricing.label_yearly;
  const monthlyLabel = pricing.label_monthly;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: resolvedCurrency }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        let message = "تعذر فتح صفحة الدفع. حاول مرة أخرى.";
        if (err.error === "stripe_not_configured") {
          message = "خدمة الدفع غير مفعّلة بعد. تواصل مع الدعم.";
        } else if (err.error === "already_subscribed") {
          message = "أنت مشترك بالفعل في باقة برايم. أدِر اشتراكك من صفحة الاشتراك.";
        }
        toast.error(message);
        return;
      }
      const json = (await res.json()) as { url: string };
      window.location.href = json.url;
    } catch {
      toast.error("تعذر الاتصال بخدمة الدفع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="size-5 text-amber-500" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {previewImage ? (
          <div className="relative overflow-hidden rounded-card border border-border">
            {/* Thumbnails are user-uploaded blurred previews — using
                next/image just to satisfy lint adds no value here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt=""
              className="h-44 w-full object-cover blur-sm"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
              <Badge variant="gold" className="gap-1">
                <Crown className="size-3.5" />
                برايم
              </Badge>
            </div>
          </div>
        ) : null}

        <div className="rounded-card border border-border bg-secondary/40 p-4">
          <p className="text-sm font-semibold">
            باقة برايم — {priceLabel} / سنة
          </p>
          <p className="text-xs text-muted-foreground">
            ≈ {monthlyLabel} شهريًا · جرّبها مجانًا 7 أيام
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {copy.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 flex-none text-emerald-500" />
                <span>{h}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-muted-foreground">
              <XIcon className="mt-0.5 size-4 flex-none" />
              <span>الخطة المجانية: محدودة إلى سيرة واحدة و5 صادرات يوميًا</span>
            </li>
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            لاحقًا
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جارٍ الانتقال…
              </>
            ) : (
              <>
                <Crown className="size-4" />
                فعّل برايم الآن
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
