"use client";

import { Ban, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { cancelSubscription, type ActionState } from "@/lib/subscriptions/actions";

import { ActionFeedback } from "./action-feedback";

interface CancelButtonProps {
  subscriptionId: string;
  userEmail: string;
  isStripe: boolean;
  alreadyCanceled: boolean;
}

export function CancelSubscriptionButton({
  subscriptionId,
  userEmail,
  isStripe,
  alreadyCanceled,
}: CancelButtonProps) {
  const [open, setOpen] = useState(false);
  if (alreadyCanceled) {
    return (
      <span className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-400">
        ملغى
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
        title="إلغاء الاشتراك"
      >
        <Ban className="h-3 w-3" />
      </button>
      {open ? (
        <Body
          subscriptionId={subscriptionId}
          userEmail={userEmail}
          isStripe={isStripe}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Body({
  subscriptionId,
  userEmail,
  isStripe,
  onClose,
}: {
  subscriptionId: string;
  userEmail: string;
  isStripe: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    cancelSubscription,
    undefined,
  );
  const [atPeriodEnd, setAtPeriodEnd] = useState(true);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-rose-700">إلغاء الاشتراك</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-2 text-xs text-slate-600">
          سيُلغى اشتراك{" "}
          <span className="font-mono text-[11px] text-slate-900" dir="ltr">
            {userEmail}
          </span>
          .
        </p>
        {isStripe ? (
          <p className="mb-3 text-[11px] text-slate-500">
            سيُحدَّث Stripe ثم تُحدَّث قاعدة البيانات في نفس العملية.
          </p>
        ) : (
          <p className="mb-3 text-[11px] text-slate-500">
            هذا الاشتراك ليس على Stripe — سيُحدَّث محلّيًا فقط.
          </p>
        )}

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <input type="hidden" name="atPeriodEnd" value={atPeriodEnd ? "true" : "false"} />

          <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 text-xs text-slate-700">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="when"
                checked={atPeriodEnd}
                onChange={() => setAtPeriodEnd(true)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-900">في نهاية الفترة الحالية</span>
                <span className="block text-[11px] text-slate-500">
                  يحتفظ المستخدم بالوصول حتى انتهاء الفترة المدفوعة.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="when"
                checked={!atPeriodEnd}
                onChange={() => setAtPeriodEnd(false)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-slate-900">إلغاء فوري</span>
                <span className="block text-[11px] text-slate-500">
                  يفقد المستخدم الوصول الآن. لا يُرجَع المبلغ تلقائيًا — استخدم زر «ردّ مبلغ» بعد
                  ذلك.
                </span>
              </span>
            </label>
          </fieldset>

          <ActionFeedback state={state} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {pending ? "جاري…" : "تأكيد الإلغاء"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
