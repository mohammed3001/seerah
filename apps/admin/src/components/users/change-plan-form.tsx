"use client";

import { useActionState } from "react";

import { changeUserPlan, type ActionState } from "@/lib/users/actions";
import { PLAN_LABELS_AR, PLAN_OPTIONS, type Plan } from "@/lib/users/types";

import { ActionFeedback } from "./action-feedback";

interface ChangePlanFormProps {
  userId: string;
  currentPlan: Plan;
  /** ISO date string or null. */
  currentExpiresAt: string | null;
}

function toLocalDate(iso: string | null): string {
  if (!iso) return "";
  // <input type="date"> wants YYYY-MM-DD in local time.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ChangePlanForm({ userId, currentPlan, currentExpiresAt }: ChangePlanFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    changeUserPlan,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">الخطة</label>
          <select
            name="plan"
            defaultValue={currentPlan}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS_AR[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            تاريخ الانتهاء (اختياري)
          </label>
          <input
            type="date"
            name="expiresAt"
            defaultValue={toLocalDate(currentExpiresAt)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <ActionFeedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#635BFF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#5247d6] disabled:opacity-60"
      >
        {pending ? "جاري الحفظ…" : "حفظ الخطة"}
      </button>
    </form>
  );
}
