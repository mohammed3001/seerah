"use client";

import { Send, StopCircle, User } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button, Textarea } from "@seerah/ui";

import { streamChat } from "@/lib/ai/chat-stream";
import type { ChatMessage, Language, RateLimitInfo } from "@/lib/ai/types";

interface Props {
  /** Built once by the parent — full resume JSON for context-aware answers. */
  resumeContext: Record<string, unknown> | null;
  language: Language;
  onRateLimit?: (info: RateLimitInfo) => void;
  /** Optional initial system/seed messages (e.g. greeting). */
  seed?: ChatMessage[];
  /** Compact mode for the floating widget. */
  compact?: boolean;
}

interface UIMessage extends ChatMessage {
  id: string;
  pending?: boolean;
}

/**
 * Streaming chat thread shared by the panel "محادثة" tab and the floating
 * widget. Renders markdown for the assistant's responses (lists / code /
 * bold / links) so the model's natural output formats correctly.
 */
export function ChatThread({
  resumeContext,
  language,
  onRateLimit,
  seed,
  compact = false,
}: Props) {
  const [messages, setMessages] = React.useState<UIMessage[]>(() =>
    (seed ?? []).map((m, i) => ({ ...m, id: `seed-${i}` })),
  );
  const [draft, setDraft] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function send() {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft("");

    const userMsg: UIMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: UIMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const conversation: ChatMessage[] = [
      ...messages
        .filter((m) => m.role !== "system")
        .map(({ role, content }) => ({ role, content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    try {
      await streamChat(
        { messages: conversation, resume_context: resumeContext, language },
        controller.signal,
        {
          onRateLimit: (info) => onRateLimit?.(info),
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m,
              ),
            );
          },
          onError: (err) => {
            toast.error(language === "ar" ? err.message_ar : err.message_en);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      pending: false,
                      content:
                        m.content ||
                        (language === "ar" ? err.message_ar : err.message_en),
                    }
                  : m,
              ),
            );
          },
        },
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
      );
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto pe-1"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
            ابدأ المحادثة. المساعد يعرف بيانات سيرتك بالكامل.
            <br />
            مثلاً: «اكتب لي رسالة تقديم لوظيفة Senior Backend».
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} compact={compact} />)
        )}
      </div>

      <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
        <Textarea
          rows={compact ? 1 : 2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            language === "ar" ? "اكتب رسالتك..." : "Type your message..."
          }
          dir={language === "ar" ? "rtl" : "ltr"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="min-h-[40px] resize-none"
          disabled={streaming}
        />
        {streaming ? (
          <Button onClick={stop} size="icon" variant="outline" aria-label="إيقاف">
            <StopCircle className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={() => void send()}
            size="icon"
            disabled={!draft.trim()}
            aria-label="إرسال"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Bubble({ message, compact }: { message: UIMessage; compact: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-foreground text-background" : "bg-accent/10 text-accent"
        }`}
        aria-hidden
      >
        {isUser ? <User className="size-3.5" /> : <span className="text-xs">✦</span>}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-foreground text-background"
            : "bg-muted text-foreground"
        } ${compact ? "text-xs" : ""}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.pending ? "…" : "")}
            </ReactMarkdown>
          </div>
        )}
        {message.pending && message.content ? (
          <span className="ms-1 inline-block h-3 w-1.5 animate-pulse bg-accent align-middle" />
        ) : null}
      </div>
    </div>
  );
}
