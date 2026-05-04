"use client";

import { useActionState, useState } from "react";

import { changeTicketStatus } from "@/lib/support/actions";
import {
  STATUS_LABELS_AR,
  type TicketStatus,
} from "@/lib/support/types";

import { ActionFeedback } from "./action-feedback";

interface StatusControlProps {
  ticketId: string;
  current: TicketStatus;
}

export function StatusControl({ ticketId, current }: StatusControlProps) {
  const [state, action, pending] = useActionState(changeTicketStatus, undefined);
  const [next, setNext] = useState<TicketStatus>(current);
  const [resolution, setResolution] = useState("");

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block text-xs font-medium text-slate-600">الحالة</label>
      <select
        name="status"
        value={next}
        onChange={(e) => setNext(e.target.value as TicketStatus)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
      >
        {(Object.keys(STATUS_LABELS_AR) as TicketStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS_AR[s]}
          </option>
        ))}
      </select>

      {next === "resolved" ? (
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">
            ملاحظة الحلّ (اختيارية — تُضاف لبريد الإغلاق)
          </label>
          <textarea
            name="resolutionNote"
            rows={3}
            maxLength={2000}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
            placeholder="مثال: تمّ ربط الحساب بالاشتراك. شكرًا لتواصلك."
          />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || next === current}
        className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ…" : "تحديث الحالة"}
      </button>

      <ActionFeedback state={state} />
    </form>
  );
}
