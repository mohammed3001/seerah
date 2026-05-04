"use client";

import { Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { deleteResume, type ActionState } from "@/lib/resumes/actions";

import { ActionFeedback } from "./action-feedback";

interface DeleteResumeButtonProps {
  resumeId: string;
  resumeTitle: string;
}

/**
 * Two-step destructive action: clicking the trash icon opens a modal that
 * requires the admin to type the word "DELETE" to confirm.  The server
 * action validates the same word so client manipulation can't bypass it.
 */
export function DeleteResumeButton({
  resumeId,
  resumeTitle,
}: DeleteResumeButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(deleteResume, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
        title="حذف"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-rose-700">
                حذف السيرة الذاتية
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-600">
              ستُحذف السيرة الذاتية{" "}
              <span className="font-medium text-slate-900">
                «{resumeTitle}»
              </span>{" "}
              بشكل نهائي مع كل الأقسام المرتبطة بها (لا يمكن التراجع).
            </p>
            <p className="mb-3 text-xs text-slate-600">
              للتأكيد، اكتب <span className="font-mono">DELETE</span> أدناه.
            </p>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="resumeId" value={resumeId} />
              <input
                name="confirm"
                placeholder="DELETE"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm uppercase shadow-sm focus:border-rose-400 focus:outline-none"
                dir="ltr"
              />

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
                  className="rounded-md bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                >
                  {pending ? "جاري الحذف…" : "حذف نهائيًا"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
