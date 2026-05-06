import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { MetricCard as MetricCardData } from "@/lib/dashboard/types";

interface MetricCardProps {
  metric: MetricCardData;
}

function formatValue(metric: MetricCardData): string {
  if (metric.formatter === "currency_usd") {
    return `$${metric.value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return metric.value.toLocaleString("ar-SA");
}

export function MetricCard({ metric }: MetricCardProps) {
  const trend = metric.trendPct;
  const trendIcon =
    trend === null ? null : trend > 0 ? (
      <ArrowUp className="h-3 w-3" />
    ) : trend < 0 ? (
      <ArrowDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{metric.label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatValue(metric)}</p>
      {trend !== null ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            trend > 0
              ? "bg-emerald-50 text-emerald-700"
              : trend < 0
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600",
          )}
        >
          {trendIcon}
          <span dir="ltr">{Math.abs(trend)}%</span>
          <span className="text-[10px] text-slate-500">مقارنة بالفترة السابقة</span>
        </p>
      ) : (
        <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          —
        </p>
      )}
    </div>
  );
}
