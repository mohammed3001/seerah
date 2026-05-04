"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const PER_PAGE_OPTIONS = [20, 50, 100] as const;

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
}

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params.toString());
  next.set("page", String(page));
  return `/subscriptions?${next.toString()}`;
}

export function SubscriptionsPagination({
  page,
  perPage,
  total,
}: PaginationProps) {
  const params = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm sm:flex-row">
      <p>
        عرض {start.toLocaleString("ar-SA")} – {end.toLocaleString("ar-SA")} من{" "}
        <span className="font-semibold text-slate-900">
          {total.toLocaleString("ar-SA")}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">لكل صفحة</span>
          <select
            defaultValue={String(perPage)}
            onChange={(e) => {
              const next = new URLSearchParams(params.toString());
              next.set("perPage", e.target.value);
              next.delete("page");
              window.location.href = `/subscriptions?${next.toString()}`;
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Link
            aria-label="السابق"
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : 0}
            href={pageHref(params, Math.max(1, page - 1))}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200",
              page <= 1
                ? "pointer-events-none opacity-50"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <span className="px-2 text-slate-700">
            <span dir="ltr">
              {page} / {lastPage}
            </span>
          </span>
          <Link
            aria-label="التالي"
            aria-disabled={page >= lastPage}
            tabIndex={page >= lastPage ? -1 : 0}
            href={pageHref(params, Math.min(lastPage, page + 1))}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200",
              page >= lastPage
                ? "pointer-events-none opacity-50"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
