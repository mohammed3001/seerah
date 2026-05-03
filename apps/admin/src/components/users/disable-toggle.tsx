"use client";

import { useActionState } from "react";

import { setUserDisabled, type ActionState } from "@/lib/users/actions";

import { ActionFeedback } from "./action-feedback";

interface DisableToggleProps {
  userId: string;
  isDisabled: boolean;
  currentReason: string | null;
}

export function DisableToggle({
  userId,
  isDisabled,
  currentReason,
}: DisableToggleProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    setUserDisabled,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="disabled" value={isDisabled ? "false" : "true"} />

      {!isDisabled ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            سبب التعطيل (يظهر في سجل المراجعة فقط)
          </label>
          <input
            type="text"
            name="reason"
            placeholder="مثال: انتهاك شروط الاستخدام"
            maxLength={500}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          سبب التعطيل الحالي:{" "}
          <span className="font-medium text-slate-700">
            {currentReason ?? "—"}
          </span>
        </p>
      )}

      <ActionFeedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className={
          isDisabled
            ? "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            : "rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
        }
      >
        {pending
          ? "جاري التحديث…"
          : isDisabled
            ? "تفعيل الحساب"
            : "تعطيل الحساب"}
      </button>
    </form>
  );
}
