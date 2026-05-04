"use client";

import { CalendarPlus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  extendSubscription,
  type ActionState,
} from "@/lib/subscriptions/actions";

import { ActionFeedback } from "./action-feedback";

interface ExtendButtonProps {
  subscriptionId: string;
  currentPeriodEnd: string | null;
  userEmail: string;
}

export function ExtendSubscriptionButton({
  subscriptionId,
  currentPeriodEnd,
  userEmail,
}: ExtendButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
        title="تمديد الفترة"
      >
        <CalendarPlus className="h-3 w-3" />
      </button>
      {open ? (
        <Body
          subscriptionId={subscriptionId}
          currentPeriodEnd={currentPeriodEnd}
          userEmail={userEmail}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Body({
  subscriptionId,
  currentPeriodEnd,
  userEmail,
  onClose,
}: {
  subscriptionId: string;
  currentPeriodEnd: string | null;
  userEmail: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(extendSubscription, undefined);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // Default = current period end + 30 days, or today + 30.
  const baseDate = currentPeriodEnd ? new Date(currentPeriodEnd) : new Date();
  if (Number.isNaN(baseDate.getTime())) baseDate.setTime(Date.now());
  baseDate.setUTCDate(baseDate.getUTCDate() + 30);
  const defaultEnd = baseDate.toISOString().slice(0, 10);
  const minEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">تمديد الاشتراك</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-1 text-xs text-slate-600">
          المستخدم:{" "}
          <span className="font-mono text-[11px] text-slate-900" dir="ltr">
            {userEmail}
          </span>
        </p>
        {currentPeriodEnd ? (
          <p className="mb-3 text-[11px] text-slate-500" dir="ltr">
            current period end: {currentPeriodEnd.slice(0, 10)}
          </p>
        ) : (
          <p className="mb-3 text-[11px] text-slate-500">
            لا يوجد تاريخ انتهاء حالي.
          </p>
        )}
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          ملاحظة: هذا التمديد محلّي فقط. لن يُغيّر فوترة Stripe — استخدمه
          لتعويض المستخدم بوصول إضافي.
        </p>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              تاريخ الانتهاء الجديد
            </label>
            <input
              type="date"
              name="newPeriodEnd"
              defaultValue={defaultEnd}
              min={minEnd}
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
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {pending ? "جاري التمديد…" : "تمديد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
