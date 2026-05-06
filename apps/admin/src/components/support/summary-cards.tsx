import { AlertTriangle, Inbox, MailOpen, ShieldAlert } from "lucide-react";

import type { StatusSummary } from "@/lib/support/types";

interface CardProps {
  label: string;
  value: number;
  hint?: string;
  Icon: typeof Inbox;
  tone?: "default" | "warn" | "danger";
}

function Card({ label, value, hint, Icon, tone = "default" }: CardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border ${toneClasses} p-4 shadow-sm`}>
      <div className="rounded-md bg-white/80 p-2 ring-1 ring-slate-200">
        <Icon className="h-4 w-4 text-slate-700" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString("ar-SA")}</span>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
    </div>
  );
}

export function SupportSummaryCards({ summary }: { summary: StatusSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="إجمالي التذاكر" value={summary.total} Icon={Inbox} />
      <Card
        label="تذاكر غير محلولة"
        value={summary.unresolved}
        hint={`${summary.byStatus.open} مفتوحة، ${summary.byStatus.in_progress} قيد المعالجة`}
        Icon={MailOpen}
        tone={summary.unresolved > 0 ? "warn" : "default"}
      />
      <Card
        label="تذاكر عاجلة"
        value={summary.byPriority.urgent}
        hint={`${summary.byPriority.high} مرتفعة`}
        Icon={ShieldAlert}
        tone={summary.byPriority.urgent > 0 ? "danger" : "default"}
      />
      <Card
        label="مفتوحة بدون تعيين"
        value={summary.unassigned_open}
        Icon={AlertTriangle}
        tone={summary.unassigned_open > 0 ? "warn" : "default"}
      />
    </div>
  );
}
