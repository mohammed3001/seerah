import {
  PRIORITY_BADGE_CLASS,
  PRIORITY_LABELS_AR,
  STATUS_BADGE_CLASS,
  STATUS_LABELS_AR,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/types";
import { cn } from "@/lib/utils/cn";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_BADGE_CLASS[status],
      )}
    >
      {STATUS_LABELS_AR[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        PRIORITY_BADGE_CLASS[priority],
      )}
    >
      {PRIORITY_LABELS_AR[priority]}
    </span>
  );
}
