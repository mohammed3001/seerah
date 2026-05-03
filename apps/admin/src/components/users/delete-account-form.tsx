"use client";

import { useActionState, useState } from "react";

import { deleteUserAccount, type ActionState } from "@/lib/users/actions";

import { ActionFeedback } from "./action-feedback";

interface DeleteAccountFormProps {
  userId: string;
  email: string;
}

export function DeleteAccountForm({ userId, email }: DeleteAccountFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    deleteUserAccount,
    undefined,
  );

  // Two-step confirmation: first an "I want to delete" toggle that reveals
  // the typed-DELETE input.  Defends against muscle-memory clicks on the
  // wrong card.
  const [armed, setArmed] = useState(false);
  const [confirm, setConfirm] = useState("");

  if (!armed) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          الحذف نهائي ويُسبّب cascade على السير الذاتية والاشتراكات وكل البيانات
          المرتبطة.
        </p>
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          أريد حذف هذا الحساب
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="email" value={email} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          اكتب <code className="font-mono text-rose-700">DELETE</code> للتأكيد
        </label>
        <input
          type="text"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          dir="ltr"
          className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 font-mono text-sm text-rose-700 focus:border-rose-500 focus:outline-none"
        />
      </div>

      <ActionFeedback state={state} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || confirm.trim().toUpperCase() !== "DELETE"}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "جاري الحذف…" : "حذف نهائياً"}
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setConfirm("");
          }}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
