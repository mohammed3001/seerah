"use client";

import {
  ChevronDown,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  X as XIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge, Button, cn } from "@seerah/ui";

interface CurrentSubscription {
  status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  provider: "stripe" | "paddle";
  currency: string | null;
}

interface Props {
  plan: "free" | "prime" | "enterprise";
  currency: "sar" | "usd";
  priceSar: number;
  priceUsd: number;
  trialDays: number;
  stripeConfigured: boolean;
  offerPaddle: boolean;
  hasCustomer: boolean;
  currentSubscription: CurrentSubscription | null;
}

interface FeatureRow {
  key: string;
  label: string;
  free: string | boolean;
  prime: string | boolean;
}

const FEATURES: readonly FeatureRow[] = [
  { key: "resumes", label: "عدد السير الذاتية", free: "1", prime: "5" },
  { key: "templates", label: "القوالب", free: "3 مجانية", prime: "كل القوالب الحالية والمستقبلية" },
  { key: "ai", label: "طلبات الذكاء الاصطناعي يوميًا", free: "5", prime: "100" },
  { key: "exports", label: "صادرات يومية (PDF/PNG)", free: "5", prime: "غير محدودة" },
  { key: "watermark", label: "بدون علامة مائية", free: false, prime: true },
  { key: "slug", label: "تخصيص رابط السيرة", free: false, prime: true },
  { key: "password", label: "حماية بكلمة مرور", free: false, prime: true },
  { key: "custom_sections", label: "أقسام مخصصة (مؤتمرات / تطوع / عضويات)", free: false, prime: true },
  { key: "support", label: "أولوية الدعم", free: false, prime: true },
  { key: "future", label: "تحديثات وميزات قادمة", free: false, prime: true },
];

const FAQ: readonly { q: string; a: string }[] = [
  {
    q: "هل أستطيع إلغاء الاشتراك في أي وقت؟",
    a: "نعم. الإلغاء يأخذ ثوانٍ من بوابة العميل، وسيظل اشتراكك فعّالًا حتى نهاية الفترة المدفوعة.",
  },
  {
    q: "ما طرق الدفع المتاحة؟",
    a: "Visa، Mastercard، Apple Pay، Google Pay، وStripe Link. للمستخدمين في المملكة نقبل مدى عبر Stripe.",
  },
  {
    q: "هل تحفظ سيرتي إذا انتهى اشتراكي؟",
    a: "بالتأكيد. تبقى كل بياناتك محفوظة، فقط بعض الميزات (مثل القوالب المميزة) ستحتاج اشتراكًا لتعمل من جديد.",
  },
  {
    q: "هل التجربة المجانية تتطلب بطاقة؟",
    a: "نعم — لتفادي الاحتيال وتسجيل الحسابات الوهمية. لن نخصم شيئًا حتى نهاية فترة الـ7 أيام، ويمكنك الإلغاء قبلها بدون أي رسوم.",
  },
];

export function SubscriptionClient({
  plan,
  currency,
  priceSar,
  priceUsd,
  trialDays,
  stripeConfigured,
  offerPaddle,
  hasCustomer,
  currentSubscription,
}: Props) {
  const [loading, setLoading] = React.useState<"checkout" | "portal" | null>(null);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const isPrime = plan === "prime" || plan === "enterprise";
  const price = currency === "sar" ? priceSar : priceUsd;
  const monthlyEquivalent = (price / 12).toFixed(currency === "sar" ? 1 : 2);
  const currencyLabel = currency === "sar" ? "ر.س" : "$";

  async function startCheckout() {
    if (!stripeConfigured) {
      toast.error("الدفع غير مفعّل بعد. تواصل مع الدعم.");
      return;
    }
    setLoading("checkout");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(
          err.error === "stripe_not_configured"
            ? "الدفع غير مفعّل بعد. تواصل مع الدعم."
            : "تعذر فتح صفحة الدفع.",
        );
        return;
      }
      const json = (await res.json()) as { url: string };
      window.location.href = json.url;
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) {
        toast.error("تعذر فتح بوابة العميل.");
        return;
      }
      const json = (await res.json()) as { url: string };
      window.location.href = json.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <section className="grid gap-6 md:grid-cols-2">
        {/* Free card */}
        <article
          className={cn(
            "rounded-card border border-border bg-card/60 p-8 backdrop-blur",
            "flex flex-col gap-4",
          )}
        >
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">المجاني</p>
            <h2 className="text-2xl font-semibold">الباقة الأساسية</h2>
            <p className="text-sm text-muted-foreground">للبدء وتجربة Seerah</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">0</span>
            <span className="text-sm text-muted-foreground">{currencyLabel} للأبد</span>
          </div>
          <ul className="mt-2 flex-1 space-y-2 text-sm">
            {FEATURES.slice(0, 4).map((f) => (
              <li key={f.key} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 rounded-full bg-foreground/40" />
                <span>
                  {f.label}: <span className="font-medium">{String(f.free)}</span>
                </span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-muted-foreground">
              <XIcon className="mt-0.5 size-4 flex-none" />
              <span>علامة مائية على ملفات التصدير</span>
            </li>
          </ul>
          {plan === "free" ? (
            <Badge variant="outline" className="w-fit">
              باقتك الحالية
            </Badge>
          ) : null}
        </article>

        {/* Prime card */}
        <article
          className={cn(
            "relative rounded-card border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 via-card to-card p-8",
            "shadow-[0_8px_30px_rgba(255,191,0,0.15)]",
            "dark:border-amber-500/40 dark:from-amber-500/10",
            "flex flex-col gap-4",
          )}
        >
          <Badge variant="gold" className="absolute -top-3 right-6 gap-1 shadow">
            <Star className="size-3" />
            الأكثر شعبية
          </Badge>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
              برايم
            </p>
            <h2 className="text-2xl font-semibold">باقة برايم</h2>
            <p className="text-sm text-muted-foreground">للمحترفين الذين يبحثون عن أفضل النتائج</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{price}</span>
            <span className="text-sm text-muted-foreground">{currencyLabel} / سنة</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ≈ {monthlyEquivalent} {currencyLabel} شهريًا · يُحسب بالسنة
          </p>
          <Badge variant="outline" className="w-fit gap-1">
            <Sparkles className="size-3.5" />
            جرّبها مجانًا {trialDays} أيام
          </Badge>
          <ul className="mt-2 flex-1 space-y-2 text-sm">
            {FEATURES.slice(0, 6).map((f) => (
              <li key={f.key} className="flex items-start gap-2">
                <span className="mt-1 inline-flex size-4 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  ✓
                </span>
                <span>
                  {f.label}:{" "}
                  <span className="font-medium">
                    {typeof f.prime === "boolean" ? "متاح" : f.prime}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {isPrime ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={openPortal}
              disabled={loading !== null || !hasCustomer}
            >
              {loading === "portal" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Crown className="size-4" />
              )}
              {hasCustomer ? "إدارة الاشتراك" : "إدارة الفوترة قريبًا"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={startCheckout}
              disabled={loading !== null}
            >
              {loading === "checkout" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Crown className="size-4" />
              )}
              اشترك الآن
            </Button>
          )}

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            الدفع آمن عبر Stripe — يمكنك الإلغاء في أي وقت
          </p>
        </article>
      </section>

      {currentSubscription ? (
        <section className="mt-10 rounded-card border border-border bg-card/60 p-6">
          <h3 className="text-lg font-semibold">حالة اشتراكك الحالي</h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">الحالة</dt>
              <dd className="font-medium">{translateStatus(currentSubscription.status)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">المزود</dt>
              <dd className="font-medium uppercase">{currentSubscription.provider}</dd>
            </div>
            {currentSubscription.current_period_end ? (
              <div>
                <dt className="text-muted-foreground">
                  {currentSubscription.cancel_at_period_end ? "ينتهي في" : "تجديد تلقائي في"}
                </dt>
                <dd className="font-medium">
                  {new Date(currentSubscription.current_period_end).toLocaleDateString("ar-SA")}
                </dd>
              </div>
            ) : null}
            {currentSubscription.trial_end ? (
              <div>
                <dt className="text-muted-foreground">انتهاء التجربة</dt>
                <dd className="font-medium">
                  {new Date(currentSubscription.trial_end).toLocaleDateString("ar-SA")}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="mt-12">
        <h3 className="mb-6 text-xl font-semibold">مقارنة كاملة للميزات</h3>
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الميزة</th>
                <th className="px-4 py-3 font-medium">المجانية</th>
                <th className="bg-amber-50/40 px-4 py-3 font-medium dark:bg-amber-500/10">
                  <span className="flex items-center gap-1">
                    <Crown className="size-3.5 text-amber-500" />
                    برايم
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, idx) => (
                <tr key={f.key} className={idx % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                  <td className="px-4 py-3">{f.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{renderCell(f.free)}</td>
                  <td className="bg-amber-50/30 px-4 py-3 dark:bg-amber-500/5">
                    {renderCell(f.prime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h3 className="mb-4 text-xl font-semibold">أسئلة شائعة</h3>
        <div className="space-y-2">
          {FAQ.map((item, idx) => {
            const open = openFaq === idx;
            return (
              <div key={item.q} className="rounded-card border border-border bg-card/60">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-right text-sm font-medium"
                >
                  {item.q}
                  <ChevronDown
                    className={cn("size-4 transition-transform", open && "rotate-180")}
                  />
                </button>
                {open ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">{item.a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {offerPaddle ? (
        <section className="mt-10 rounded-card border border-amber-200 bg-amber-50/40 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-medium">يبدو أنك من بلد قد لا يدعم Stripe</p>
          <p className="mt-1 text-muted-foreground">
            خيار الدفع عبر Paddle قادم قريبًا. حتى ذلك الحين، يمكن مراسلة الدعم لتفعيل اشتراك يدويًا.
          </p>
        </section>
      ) : null}
    </>
  );
}

function renderCell(value: string | boolean) {
  if (value === true) {
    return <span className="text-emerald-600">✓ متاح</span>;
  }
  if (value === false) {
    return (
      <span className="text-muted-foreground">
        <XIcon className="inline size-4" />
      </span>
    );
  }
  return value;
}

function translateStatus(status: string | null): string {
  switch (status) {
    case "active":
      return "نشِط";
    case "trialing":
      return "في فترة التجربة";
    case "past_due":
      return "تأخر السداد";
    case "canceled":
      return "ملغى";
    case "incomplete":
      return "غير مكتمل";
    case "incomplete_expired":
      return "منتهٍ";
    case "unpaid":
      return "غير مدفوع";
    default:
      return status ?? "غير معروف";
  }
}
