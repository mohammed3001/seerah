"use client";

import { Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import { deleteTemplate, type ActionState } from "@/lib/templates/actions";

import { ActionFeedback } from "./action-feedback";

interface DeleteTemplateButtonProps {
  templateId: string;
  templateLabel: string;
  /** When > 0, deletion is blocked at the database level — the button is disabled. */
  usageCount: number;
}

/**
 * Two-step delete: trash icon opens a modal that requires typing "DELETE"
 * to confirm.  Disabled when the template is still referenced by any
 * resume — admins should re-template those rows first (Phase B2 supports
 * bulk template change).  The RPC also enforces this server-side.
 */
export function DeleteTemplateButton({
  templateId,
  templateLabel,
  usageCount,
}: DeleteTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(deleteTemplate, undefined);

  const blocked = usageCount > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={blocked}
        className="inline-flex items-center justify-center rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
        title={
          blocked
            ? `لا يمكن الحذف — ${usageCount} سيرة تستخدم هذا القالب`
            : "حذف القالب"
        }
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-rose-700">حذف القالب</h3>
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
              سيُحذف القالب{" "}
              <span className="font-medium text-slate-900">«{templateLabel}»</span>{" "}
              بشكل نهائي. لا يمكن التراجع. للتأكيد، اكتب{" "}
              <span className="font-mono">DELETE</span> أدناه.
            </p>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="templateId" value={templateId} />
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
