"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  FEATURED_LABELS_AR,
  FEATURED_OPTIONS,
  LANGUAGE_LABELS_AR,
  LANGUAGE_OPTIONS,
  type TemplateOption,
} from "@/lib/resumes/types";
import { cn } from "@/lib/utils/cn";

interface ResumesFiltersProps {
  templates: TemplateOption[];
  perPage: number;
}

const FORM_KEYS = [
  "q",
  "templateId",
  "language",
  "featured",
  "completionMin",
  "completionMax",
  "from",
  "to",
  "perPage",
] as const;

export function ResumesFilters({ templates, perPage }: ResumesFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(next: URLSearchParams) {
    next.delete("page");
    startTransition(() => router.replace(`/resumes?${next.toString()}`));
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    update(next);
  }

  const q = params.get("q") ?? "";
  const templateId = params.get("templateId") ?? "";
  const language = params.get("language") ?? "";
  const featured = params.get("featured") ?? "";
  const completionMin = params.get("completionMin") ?? "";
  const completionMax = params.get("completionMax") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const hasFilter =
    q || templateId || language || featured || completionMin || completionMax || from || to;

  return (
    <form
      action="/resumes"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // Preserve params not controlled by this form (sort, dir).  Same
        // pattern as users/filters.tsx after the PR-B1 review fix.
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
          بحث (العنوان أو بريد المالك)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="مثال: مهندس برمجيات أو user@…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pe-8 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">القالب</label>
        <select
          name="templateId"
          defaultValue={templateId}
          onChange={(e) => setParam("templateId", e.target.value || null)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name_ar ?? t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">اللغة</label>
        <select
          name="language"
          defaultValue={language}
          onChange={(e) => setParam("language", e.target.value || null)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS_AR[lang]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">التمييز</label>
        <select
          name="featured"
          defaultValue={featured}
          onChange={(e) => setParam("featured", e.target.value || null)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
        >
          <option value="">الكل</option>
          {FEATURED_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {FEATURED_LABELS_AR[opt]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">اكتمال من %</label>
          <input
            type="number"
            name="completionMin"
            defaultValue={completionMin}
            min={0}
            max={100}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">إلى %</label>
          <input
            type="number"
            name="completionMax"
            defaultValue={completionMax}
            min={0}
            max={100}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">من تاريخ</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">إلى تاريخ</label>
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
              // Preserve perPage on reset so the admin's page-size choice
              // doesn't silently revert to the default.  Same pattern as
              // users/filters.tsx.
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
          {pending ? "جاري التطبيق…" : "تطبيق المرشحات"}
        </button>
      </div>
    </form>
  );
}
