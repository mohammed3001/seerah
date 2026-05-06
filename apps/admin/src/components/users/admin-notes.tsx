"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { addUserAdminNote, deleteUserAdminNote, type ActionState } from "@/lib/users/actions";
import type { UserAdminNoteRow } from "@/lib/users/detail";

import { ActionFeedback } from "./action-feedback";

interface AdminNotesProps {
  userId: string;
  notes: UserAdminNoteRow[];
}

export function AdminNotes({ userId, notes }: AdminNotesProps) {
  const [addState, addAction, addPending] = useActionState<ActionState | undefined, FormData>(
    addUserAdminNote,
    undefined,
  );

  return (
    <div className="space-y-4">
      <form action={addAction} className="space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <textarea
          name="body"
          rows={3}
          required
          maxLength={5000}
          placeholder="أضف ملاحظة داخلية لا يراها المستخدم…"
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <ActionFeedback state={addState} />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={addPending}
            className="rounded-md bg-[#635BFF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#5247d6] disabled:opacity-60"
          >
            {addPending ? "جاري الحفظ…" : "إضافة ملاحظة"}
          </button>
        </div>
      </form>

      <div className="border-t border-slate-100 pt-4">
        {notes.length === 0 ? (
          <p className="text-xs text-slate-400">لا توجد ملاحظات بعد.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} userId={userId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NoteItem({ note, userId }: { note: UserAdminNoteRow; userId: string }) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    deleteUserAdminNote,
    undefined,
  );

  return (
    <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
          <p className="text-[10px] text-slate-500">
            <span dir="ltr">{note.admin_email ?? "—"}</span>{" "}
            <span className="text-slate-400">·</span>{" "}
            <span dir="ltr">{format(new Date(note.created_at), "yyyy-MM-dd HH:mm")}</span>
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="noteId" value={note.id} />
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={pending}
            aria-label="حذف الملاحظة"
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      {state && !state.ok ? (
        <p className="mt-1 text-[10px] text-rose-600">{state.message}</p>
      ) : null}
    </li>
  );
}
