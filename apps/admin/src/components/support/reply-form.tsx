"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { replyToTicket } from "@/lib/support/actions";

import { ActionFeedback } from "./action-feedback";

interface ReplyFormProps {
  ticketId: string;
}

export function ReplyForm({ ticketId }: ReplyFormProps) {
  const [state, action, pending] = useActionState(replyToTicket, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  // Clear the textarea after a successful send so the operator doesn't
  // accidentally double-post the same reply.
  useEffect(() => {
    if (state?.ok) {
      setBody("");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="ticketId" value={ticketId} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          الردّ (نصّ عادي)
        </label>
        <textarea
          name="body"
          required
          rows={6}
          maxLength={8000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-7 shadow-sm focus:border-slate-400 focus:outline-none"
          placeholder="اكتب ردّك هنا. سيُرسَل بريدًا للمستخدم بعد الحفظ."
        />
        <p className="mt-1 text-[11px] text-slate-500">
          {body.length}/8000 حرفًا — يُرسَل بريد للمستخدم تلقائيًا (إن لم يكن
          ملاحظة داخلية).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            name="isInternal"
            value="on"
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          ملاحظة داخلية فقط (لا تُرسَل للمستخدم)
        </label>

        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {pending ? "جارٍ الإرسال…" : "إرسال"}
        </button>
      </div>

      <ActionFeedback state={state} />
    </form>
  );
}
