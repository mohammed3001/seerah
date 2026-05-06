"use client";

import { Loader2, Save } from "lucide-react";
import { useActionState, useState } from "react";

import { updateTicketAdminNotes } from "@/lib/support/actions";

import { ActionFeedback } from "./action-feedback";

interface AdminNotesFormProps {
  ticketId: string;
  initial: string;
}

export function AdminNotesForm({ ticketId, initial }: AdminNotesFormProps) {
  const [state, action, pending] = useActionState(updateTicketAdminNotes, undefined);
  const [notes, setNotes] = useState(initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block text-xs font-medium text-slate-600">ملاحظات داخلية على التذكرة</label>
      <p className="text-[11px] text-slate-500">
        نص حرّ مخصّص لفريق الدعم. لا يُرسَل بريد، ولا يراه المستخدم.
      </p>
      <textarea
        name="notes"
        rows={4}
        maxLength={8000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        حفظ الملاحظات
      </button>

      <ActionFeedback state={state} />
    </form>
  );
}
