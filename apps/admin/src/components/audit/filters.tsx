"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils/cn";

interface AuditFiltersProps {
  knownActions: string[];
  perPage: number;
}

export function AuditFilters({ knownActions, perPage }: AuditFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: URLSearchParams) {
    // Reset page when any filter changes; otherwise the user lands on
    // page 7 of a freshly-filtered result that only has 2 pages.
    next.delete("page");
    startTransition(() => router.replace(`/audit?${next.toString()}`));
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    update(next);
  }

  const q = params.get("q") ?? "";
  const action = params.get("action") ?? "";
  const adminEmail = params.get("adminEmail") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const hasFilter = q || action || adminEmail || from || to;

  return (
    <form
      action="/audit"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const next = new URLSearchParams();
        for (const [k, v] of formData.entries()) {
          if (typeof v === "string" && v.length > 0) next.set(k, v);
        }
        update(next);
      }}
    >
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">بحث حر</label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="بريد، إجراء، معرّف هدف…"
            className="w-full rounded-md border border-slate-200 bg-white pe-8 ps-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">الإجراء</label>
        <select
          name="action"
          defaultValue={action}
          onChange={(e) => setParam("action", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        >
          <option value="">الكلّ</option>
          {knownActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">المشرف</label>
        <input
          type="email"
          name="adminEmail"
          defaultValue={adminEmail}
          placeholder="admin@…"
          dir="ltr"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">من تاريخ</label>
        <input
          type="datetime-local"
          name="from"
          defaultValue={from}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">إلى تاريخ</label>
        <input
          type="datetime-local"
          name="to"
          defaultValue={to}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <input type="hidden" name="perPage" value={String(perPage)} />

      <div className="flex items-end gap-2 md:col-span-6">
        <button
          type="submit"
          className={cn(
            "rounded-md bg-[#635BFF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#5247d6]",
            pending && "opacity-70",
          )}
          disabled={pending}
        >
          تطبيق المرشّحات
        </button>
        {hasFilter ? (
          <button
            type="button"
            onClick={() =>
              startTransition(() => router.replace(`/audit?perPage=${perPage}`))
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            تفريغ
          </button>
        ) : null}
      </div>
    </form>
  );
}
