import { format } from "date-fns";
import { Lock, Paperclip } from "lucide-react";

import type { TicketMessage } from "@/lib/support/types";
import { cn } from "@/lib/utils/cn";

interface ThreadProps {
  /** The original (first) message body — shown as the very first bubble. */
  initialMessage: {
    body: string;
    attachment_url: string | null;
    created_at: string;
    user_label: string;
  };
  messages: TicketMessage[];
}

function safeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy-MM-dd HH:mm");
}

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
}

interface BubbleProps {
  authorType: "user" | "admin";
  authorLabel: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  isInternal?: boolean;
}

function Bubble({
  authorType,
  authorLabel,
  body,
  attachmentUrl,
  createdAt,
  isInternal,
}: BubbleProps) {
  const isAdmin = authorType === "admin";
  return (
    <article
      className={cn(
        "rounded-2xl border px-4 py-3 shadow-sm",
        isInternal
          ? "border-amber-200 bg-amber-50"
          : isAdmin
            ? "border-indigo-200 bg-indigo-50"
            : "border-slate-200 bg-white",
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
              isInternal
                ? "bg-amber-200 text-amber-900"
                : isAdmin
                  ? "bg-indigo-200 text-indigo-900"
                  : "bg-slate-200 text-slate-700",
            )}
          >
            {isInternal ? "ملاحظة داخلية" : isAdmin ? "ردّ المشرف" : "رسالة المستخدم"}
          </span>
          <span className="text-slate-700" dir="ltr">
            {authorLabel}
          </span>
          {isInternal ? (
            <Lock className="h-3 w-3 text-amber-700" />
          ) : null}
        </div>
        <time className="text-slate-500" dir="ltr">
          {safeDate(createdAt)}
        </time>
      </header>

      <div className="space-y-2 text-sm leading-7 text-slate-800">
        {paragraphs(body).map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>

      {attachmentUrl ? (
        <a
          href={attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600 hover:underline"
        >
          <Paperclip className="h-3 w-3" />
          فتح المرفق
        </a>
      ) : null}
    </article>
  );
}

export function MessageThread({ initialMessage, messages }: ThreadProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">المحادثة</h2>
      <Bubble
        authorType="user"
        authorLabel={initialMessage.user_label}
        body={initialMessage.body}
        attachmentUrl={initialMessage.attachment_url}
        createdAt={initialMessage.created_at}
      />
      {messages.map((m) => (
        <Bubble
          key={m.id}
          authorType={m.author_type}
          authorLabel={m.author_label}
          body={m.body}
          attachmentUrl={m.attachment_url}
          createdAt={m.created_at}
          isInternal={m.is_internal}
        />
      ))}
    </section>
  );
}
