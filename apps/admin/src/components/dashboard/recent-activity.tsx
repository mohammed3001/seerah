import { format, formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";

import type {
  RecentSignup,
  RecentSubscriptionEvent,
  RecentTicket,
} from "@/lib/dashboard/types";

const STATUS_LABELS: Record<RecentTicket["status"], string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};

const STATUS_COLORS: Record<RecentTicket["status"], string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-100 text-slate-600",
};

function relative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: arSA });
  } catch {
    return format(new Date(iso), "yyyy-MM-dd HH:mm");
  }
}

export function RecentSignupsList({ items }: { items: RecentSignup[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-400">لا توجد تسجيلات حديثة.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => (
        <li key={row.id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {row.full_name ?? row.email}
            </p>
            {row.full_name ? (
              <p className="truncate text-xs text-slate-500" dir="ltr">
                {row.email}
              </p>
            ) : null}
          </div>
          <div className="ms-3 flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                row.plan === "prime"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {row.plan === "prime"
                ? "برايم"
                : row.plan === "enterprise"
                  ? "مؤسسات"
                  : "مجاني"}
            </span>
            <span className="text-[11px] text-slate-400">{relative(row.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecentTicketsList({ items }: { items: RecentTicket[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-400">لا توجد تذاكر حديثة.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{row.subject}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500" dir="ltr">
              {row.user_email ?? "مستخدم محذوف"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[row.status]}`}
            >
              {STATUS_LABELS[row.status]}
            </span>
            <span className="text-[11px] text-slate-400">{relative(row.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecentSubscriptionsList({ items }: { items: RecentSubscriptionEvent[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-400">لا توجد أحداث اشتراك حديثة.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => (
        <li
          key={`${row.user_id}-${row.updated_at}`}
          className="flex items-start justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900" dir="ltr">
              {row.user_email ?? row.user_id.slice(0, 8)}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              المزوّد: {row.provider === "stripe" ? "Stripe" : "Paddle"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {row.status ?? "—"}
            </span>
            <span className="text-[11px] text-slate-400">{relative(row.updated_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
