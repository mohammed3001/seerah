"use client";

import { Crown, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { grantPrimeByEmail, type ActionState } from "@/lib/subscriptions/actions";

import { ActionFeedback } from "./action-feedback";

/**
 * "Grant Prime free" modal.  Lets the operator type any user's email +
 * an expiry date; the action looks up the matching profile, calls
 * `admin_set_user_plan(prime, expires_at)`, and writes an audit entry
 * — same atomic RPC used on the user detail page.
 *
 * Body is split so closing the modal unmounts it and resets
 * `useActionState` (matches the lesson learnt in PR-C1).
 */
export function GrantPrimeModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
      >
        <Crown className="h-3.5 w-3.5" />
        منح برايم مجانًا
      </button>
      {open ? <Body onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    grantPrimeByEmail,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // Default expiry = one year from today (yyyy-mm-dd).
  const defaultExpiry = (() => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">منح برايم مجانًا</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-600">
          سيُحدَّث المستخدم على خطّة برايم مع تاريخ انتهاء محدّد. لا يُنشئ هذا اشتراكًا في Stripe —
          للتعويض اليدوي فقط (لا يفوتر).
        </p>

        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">تاريخ الانتهاء</label>
            <input
              type="date"
              name="expiresAt"
              defaultValue={defaultExpiry}
              required
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          <ActionFeedback state={state} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? "جاري التحديث…" : "منح برايم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
