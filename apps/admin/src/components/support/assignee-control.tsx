"use client";

import { useActionState, useState } from "react";

import { assignTicket } from "@/lib/support/actions";
import { type AssigneeOption } from "@/lib/support/types";

import { ActionFeedback } from "./action-feedback";

interface AssigneeControlProps {
  ticketId: string;
  current: string | null;
  assignees: AssigneeOption[];
}

export function AssigneeControl({
  ticketId,
  current,
  assignees,
}: AssigneeControlProps) {
  const [state, action, pending] = useActionState(assignTicket, undefined);
  const [next, setNext] = useState<string>(current ?? "");

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block text-xs font-medium text-slate-600">
        التعيين
      </label>
      <select
        name="assignee"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
      >
        <option value="">— غير مُسنَدة —</option>
        {assignees.map((a) => (
          <option key={a.id} value={a.id}>
            {a.email}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || next === (current ?? "")}
        className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ…" : "تحديث التعيين"}
      </button>

      <ActionFeedback state={state} />
    </form>
  );
}
