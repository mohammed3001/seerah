import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  customerDashboardUrl,
  refundDashboardUrl,
} from "@/lib/subscriptions/stripe";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS_AR,
  type SortableColumn,
  type SubscriptionRow,
} from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils/cn";

import { CancelSubscriptionButton } from "./cancel-button";
import { ExtendSubscriptionButton } from "./extend-button";

interface TableProps {
  rows: SubscriptionRow[];
  sort: SortableColumn;
  dir: "asc" | "desc";
  sortHrefs: Record<SortableColumn, string>;
}

function SortHeader({
  label,
  active,
  dir,
  href,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  href: string;
}) {
  return (
    <th scope="col" className="px-4 py-3">
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900",
          active ? "text-slate-900" : "text-slate-500",
        )}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </Link>
    </th>
  );
}

function safeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy-MM-dd");
}

export function SubscriptionsTable({
  rows,
  sort,
  dir,
  sortHrefs,
}: TableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-400">
        لا يوجد اشتراكات تطابق الفلاتر الحالية.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-right text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">المستخدم</th>
              <SortHeader
                label="الحالة"
                active={sort === "status"}
                dir={dir}
                href={sortHrefs.status}
              />
              <SortHeader
                label="المزوّد"
                active={sort === "provider"}
                dir={dir}
                href={sortHrefs.provider}
              />
              <th scope="col" className="px-4 py-3">المعرّف</th>
              <SortHeader
                label="تاريخ البداية"
                active={sort === "created_at"}
                dir={dir}
                href={sortHrefs.created_at}
              />
              <SortHeader
                label="ينتهي في"
                active={sort === "current_period_end"}
                dir={dir}
                href={sortHrefs.current_period_end}
              />
              <th scope="col" className="px-4 py-3">العملة</th>
              <th scope="col" className="px-4 py-3 text-left">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => {
              const statusKey = row.status ?? "unknown";
              const isCanceled =
                row.status === "canceled" ||
                row.status === "incomplete_expired";
              const isStripe = row.provider === "stripe";
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col">
                      <Link
                        href={`/users/${row.user_id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        {row.user_full_name ?? "—"}
                      </Link>
                      <span
                        className="text-[11px] text-slate-500"
                        dir="ltr"
                      >
                        {row.user_email || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_BADGE_CLASS[statusKey] ??
                          "bg-slate-100 text-slate-600",
                      )}
                    >
                      {STATUS_LABELS_AR[statusKey] ?? statusKey}
                    </span>
                    {row.cancel_at_period_end && !isCanceled ? (
                      <span className="ms-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        إلغاء معلّق
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs uppercase tracking-wide text-slate-600">
                    {row.provider}
                  </td>
                  <td className="px-4 py-3 align-middle text-[11px]" dir="ltr">
                    {row.stripe_subscription_id ? (
                      <a
                        href={refundDashboardUrl(row.stripe_subscription_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-slate-700 hover:text-slate-900"
                      >
                        {row.stripe_subscription_id.slice(0, 14)}…
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 align-middle text-[11px] text-slate-500"
                    dir="ltr"
                  >
                    {safeDate(row.created_at)}
                  </td>
                  <td
                    className="px-4 py-3 align-middle text-[11px] text-slate-700"
                    dir="ltr"
                  >
                    {safeDate(row.current_period_end)}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs uppercase text-slate-600">
                    {row.currency ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-middle text-left">
                    <div className="flex items-center justify-end gap-1.5">
                      <ExtendSubscriptionButton
                        subscriptionId={row.id}
                        currentPeriodEnd={row.current_period_end}
                        userEmail={row.user_email}
                      />
                      <CancelSubscriptionButton
                        subscriptionId={row.id}
                        userEmail={row.user_email}
                        isStripe={isStripe}
                        alreadyCanceled={isCanceled}
                      />
                      {row.stripe_customer_id ? (
                        <a
                          href={customerDashboardUrl(row.stripe_customer_id)}
                          target="_blank"
                          rel="noreferrer"
                          title="فتح في لوحة Stripe (لردّ المبلغ يدويًا)"
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
