"use client";

import { CheckCircle2, UserCog, X } from "lucide-react";
import { useActionState } from "react";

import {
  bulkAssignTickets,
  bulkChangeTicketStatus,
} from "@/lib/support/actions";
import { type AssigneeOption } from "@/lib/support/types";

import { ActionFeedback } from "./action-feedback";

interface BulkActionsBarProps {
  selectedIds: string[];
  assignees: AssigneeOption[];
  onClear: () => void;
}

export function BulkActionsBar({
  selectedIds,
  assignees,
  onClear,
}: BulkActionsBarProps) {
  const [statusState, statusAction, statusPending] = useActionState(
    bulkChangeTicketStatus,
    undefined,
  );
  const [assignState, assignAction, assignPending] = useActionState(
    bulkAssignTickets,
    undefined,
  );

  if (selectedIds.length === 0) return null;

  const idsCsv = selectedIds.join(",");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-700">
          محدَّد:{" "}
          <span className="font-semibold text-slate-900">
            {selectedIds.length}
          </span>{" "}
          تذكرة
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
        >
          <X className="h-3 w-3" />
          إلغاء التحديد
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={statusAction} className="flex items-center gap-2">
          <input type="hidden" name="ticketIds" value={idsCsv} />
          <input type="hidden" name="status" value="resolved" />
          <button
            type="submit"
            disabled={statusPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            تحديد كمحلولة
          </button>
        </form>

        <form action={assignAction} className="flex items-center gap-2">
          <input type="hidden" name="ticketIds" value={idsCsv} />
          <select
            name="assignee"
            defaultValue=""
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">إلغاء التعيين</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={assignPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            <UserCog className="h-3.5 w-3.5" />
            تعيين / إلغاء
          </button>
        </form>
      </div>

      <ActionFeedback state={statusState} />
      <ActionFeedback state={assignState} />
    </div>
  );
}
