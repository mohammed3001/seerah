import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import { formatMoney } from "@/lib/subscriptions/revenue";
import type { RevenueSummary, StatusSummary } from "@/lib/subscriptions/types";
import { STATUS_LABELS_AR } from "@/lib/subscriptions/types";

interface RevenueSummaryCardsProps {
  revenue: RevenueSummary;
  statusSummary: StatusSummary;
}

function MoneyList({
  buckets,
  emptyLabel,
}: {
  buckets: { amount_cents: number; currency: string }[];
  emptyLabel: string;
}) {
  if (buckets.length === 0) {
    return <span className="text-sm text-slate-400">{emptyLabel}</span>;
  }
  return (
    <div className="space-y-0.5" dir="ltr">
      {buckets.map((b) => (
        <div key={b.currency} className="text-xl font-semibold text-slate-900">
          {formatMoney(b.amount_cents, b.currency)}
        </div>
      ))}
    </div>
  );
}

export function RevenueSummaryCards({
  revenue,
  statusSummary,
}: RevenueSummaryCardsProps) {
  const churnPct =
    revenue.churn_rate === null
      ? null
      : (revenue.churn_rate * 100).toFixed(1);

  return (
    <div className="space-y-3">
      {!revenue.configured ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">إعدادات Stripe ناقصة</p>
            <p className="mt-1 text-[11px] text-amber-700">
              MRR/ARR لا تظهر لأن{" "}
              <span className="font-mono">STRIPE_SECRET_KEY</span> غير
              مهيّأ. الأرقام أدناه (نشط، تجريبي، إلخ.) محسوبة من قاعدة
              البيانات وتظهر بشكل طبيعي. أضف المفتاح في إعدادات النشر
              لتفعيل الإيرادات الحقيقيّة.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">
            الإيرادات الشهرية المتكرّرة (MRR)
          </p>
          <div className="mt-2">
            <MoneyList
              buckets={revenue.mrr}
              emptyLabel={
                revenue.configured ? "لا اشتراكات نشطة" : "غير متاح بدون Stripe"
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">
            الإيرادات السنوية (ARR)
          </p>
          <div className="mt-2">
            <MoneyList
              buckets={revenue.arr}
              emptyLabel={
                revenue.configured ? "لا اشتراكات نشطة" : "غير متاح بدون Stripe"
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">نشط</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {revenue.active_count.toLocaleString("ar-SA")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            تجريبي:{" "}
            <span className="font-medium text-slate-700">
              {revenue.trialing_count.toLocaleString("ar-SA")}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">
            مشتركون جدد هذا الشهر
          </p>
          <p className="mt-2 flex items-baseline gap-1 text-2xl font-semibold text-slate-900">
            {revenue.new_this_month.toLocaleString("ar-SA")}
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            ملغى هذا الشهر:{" "}
            <span className="font-medium text-rose-600">
              {revenue.canceled_this_month.toLocaleString("ar-SA")}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">معدّل الانسحاب (آخر ٣٠ يومًا)</p>
          <p className="mt-2 flex items-baseline gap-1 text-2xl font-semibold text-slate-900">
            {churnPct === null ? (
              <span className="text-slate-400">—</span>
            ) : (
              <>
                {churnPct}%
                {revenue.churn_rate && revenue.churn_rate > 0.05 ? (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                )}
              </>
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            ملغى ÷ نشط قبل ٣٠ يومًا
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">إجمالي الاشتراكات</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {statusSummary.total.toLocaleString("ar-SA")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {Object.entries(statusSummary.byStatus)
              .slice(0, 2)
              .map(([s, c]) => `${STATUS_LABELS_AR[s] ?? s}: ${c}`)
              .join(" · ") || "—"}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        المصدر:{" "}
        {revenue.source === "stripe" ? "Stripe API + قاعدة البيانات" : "تقدير محلّي (Stripe غير مهيّأ)"}
      </p>
    </div>
  );
}
