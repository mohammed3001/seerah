"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils/cn";
import {
  PLAN_LABELS_AR,
  PLAN_OPTIONS,
  STATUS_LABELS_AR,
  STATUS_OPTIONS,
} from "@/lib/users/types";

interface UsersFiltersProps {
  countries: string[];
  perPage: number;
}

export function UsersFilters({ countries, perPage }: UsersFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => router.replace(`/users?${next.toString()}`));
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    update(next);
  }

  const q = params.get("q") ?? "";
  const plan = params.get("plan") ?? "";
  const country = params.get("country") ?? "";
  const status = params.get("status") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const hasFilter = q || plan || country || status || from || to;

  return (
    <form
      action="/users"
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
        <label className="mb-1 block text-xs font-medium text-slate-600">
          بحث (الاسم أو البريد)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="اسم، بريد…"
            className="w-full rounded-md border border-slate-200 bg-white pe-8 ps-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">الخطة</label>
        <select
          name="plan"
          defaultValue={plan}
          onChange={(e) => setParam("plan", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        >
          <option value="">الكل</option>
          {PLAN_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {PLAN_LABELS_AR[p]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">الحالة</label>
        <select
          name="status"
          defaultValue={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        >
          <option value="">الكل</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS_AR[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">الدولة</label>
        <select
          name="country"
          defaultValue={country}
          onChange={(e) => setParam("country", e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        >
          <option value="">الكل</option>
          {countries.map((c) => (
            <option key={c} value={c} dir="ltr">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">من تاريخ</label>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">إلى تاريخ</label>
        <input
          type="date"
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
          تطبيق المرشحات
        </button>
        {hasFilter ? (
          <button
            type="button"
            onClick={() =>
              startTransition(() => router.replace(`/users?perPage=${perPage}`))
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
