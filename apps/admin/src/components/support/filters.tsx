"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  PRIORITY_LABELS_AR,
  STATUS_LABELS_AR,
  type AssigneeOption,
} from "@/lib/support/types";
import { cn } from "@/lib/utils/cn";

interface SupportFiltersProps {
  assignees: AssigneeOption[];
  perPage: number;
}

const FORM_KEYS = [
  "q",
  "status",
  "priority",
  "assignee",
  "unassigned",
  "from",
  "to",
  "perPage",
] as const;

export function SupportFilters({ assignees, perPage }: SupportFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => router.replace(`/support?${next.toString()}`));
  }

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const assignee = params.get("assignee") ?? "";
  const unassigned = params.get("unassigned") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const hasFilter =
    q || status || priority || assignee || unassigned || from || to;

  return (
    <form
      action="/support"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const next = new URLSearchParams(params.toString());
        for (const key of FORM_KEYS) next.delete(key);
        for (const [k, v] of formData.entries()) {
          if (typeof v === "string" && v.length > 0) next.set(k, v);
        }
        update(next);
      }}
    >
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          بحث (الموضوع أو بريد المستخدم أو معرّف التذكرة)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="موضوع، أو user@…، أو UUID"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pe-8 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          الحالة
        </label>
        <select
          name="status"
          defaultValue={status}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {(Object.keys(STATUS_LABELS_AR) as Array<keyof typeof STATUS_LABELS_AR>).map(
            (s) => (
              <option key={s} value={s}>
                {STATUS_LABELS_AR[s]}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          الأولوية
        </label>
        <select
          name="priority"
          defaultValue={priority}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {(
            Object.keys(PRIORITY_LABELS_AR) as Array<
              keyof typeof PRIORITY_LABELS_AR
            >
          ).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS_AR[p]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          المُسنَدة إلى
        </label>
        <select
          name="assignee"
          defaultValue={assignee}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          غير مُسنَدة فقط
        </label>
        <select
          name="unassigned"
          defaultValue={unassigned}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          <option value="yes">غير مُسنَدة</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 md:col-span-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            من تاريخ
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            إلى تاريخ
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </div>
      </div>

      <input type="hidden" name="perPage" value={String(perPage)} />

      <div className="flex items-center justify-end gap-2 md:col-span-6">
        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams();
              next.set("perPage", String(perPage));
              update(next);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50",
            )}
          >
            <X className="h-3 w-3" />
            إعادة تعيين
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          تطبيق
        </button>
      </div>
    </form>
  );
}
