"use client";

import { Layers, X } from "lucide-react";
import { useActionState, useState } from "react";

import { changeResumeTemplate, type ActionState } from "@/lib/resumes/actions";
import type { TemplateOption } from "@/lib/resumes/types";

import { ActionFeedback } from "./action-feedback";

interface ChangeTemplateMenuProps {
  resumeId: string;
  currentTemplateId: string;
  templates: TemplateOption[];
}

/**
 * Compact dialog for changing a resume's template.  Renders a hidden modal
 * that toggles open on the trigger button — keeps the table row clean
 * while still allowing one-click access.
 */
export function ChangeTemplateMenu({
  resumeId,
  currentTemplateId,
  templates,
}: ChangeTemplateMenuProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    changeResumeTemplate,
    undefined,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        title="تغيير القالب"
      >
        <Layers className="h-3 w-3" />
        القالب
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">تغيير القالب</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="resumeId" value={resumeId} />
              <label className="block text-xs font-medium text-slate-600">القالب الجديد</label>
              <select
                name="templateId"
                defaultValue={currentTemplateId}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name_ar ?? t.name}
                  </option>
                ))}
              </select>

              <ActionFeedback state={state} />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? "جاري الحفظ…" : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
