"use client";

import { useActionState, useState } from "react";

import { setTicketPriority } from "@/lib/support/actions";
import { PRIORITY_LABELS_AR, type TicketPriority } from "@/lib/support/types";

import { ActionFeedback } from "./action-feedback";

interface PriorityControlProps {
  ticketId: string;
  current: TicketPriority;
}

export function PriorityControl({ ticketId, current }: PriorityControlProps) {
  const [state, action, pending] = useActionState(setTicketPriority, undefined);
  const [next, setNext] = useState<TicketPriority>(current);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block text-xs font-medium text-slate-600">الأولوية</label>
      <select
        name="priority"
        value={next}
        onChange={(e) => setNext(e.target.value as TicketPriority)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
      >
        {(Object.keys(PRIORITY_LABELS_AR) as TicketPriority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS_AR[p]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || next === current}
        className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ…" : "تحديث الأولوية"}
      </button>

      <ActionFeedback state={state} />
    </form>
  );
}
