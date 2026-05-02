"use client";

/**
 * SSE consumer for /api/ai/chat. The route handler in apps/web proxies the
 * FastAPI service's text/event-stream body unchanged; we parse the standard
 * `event: <name>\ndata: <json>` framing here.
 *
 * Events emitted by the upstream:
 *   - rate_limit  → { limit, remaining, reset_at }
 *   - delta       → { text }
 *   - error       → { error, message_ar, message_en }
 *   - done        → {}
 */

import type { ChatMessage, Language, RateLimitInfo } from "./types";

export interface ChatStreamCallbacks {
  onRateLimit?: (info: RateLimitInfo) => void;
  onDelta: (text: string) => void;
  onError?: (err: { error: string; message_ar: string; message_en: string }) => void;
  onDone?: () => void;
}

export async function streamChat(
  body: {
    messages: ChatMessage[];
    resume_context?: Record<string, unknown> | null;
    language: Language;
  },
  signal: AbortSignal,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail: { error?: string; message_ar?: string; message_en?: string } = {};
    try {
      detail = (await response.json()) as typeof detail;
    } catch {
      // ignore
    }
    callbacks.onError?.({
      error: detail.error ?? "http_error",
      message_ar: detail.message_ar ?? "تعذّر بدء المحادثة.",
      message_en: detail.message_en ?? `HTTP ${response.status}`,
    });
    return;
  }

  if (!response.body) {
    callbacks.onError?.({
      error: "no_stream",
      message_ar: "لم يصل ردّ من الخادم.",
      message_en: "No response stream received.",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames end with a blank line.
      let nl: number;
      while ((nl = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        handleFrame(frame, callbacks);
      }
    }
    if (buffer.trim()) handleFrame(buffer, callbacks);
    callbacks.onDone?.();
  } catch (err) {
    if (signal.aborted) return;
    callbacks.onError?.({
      error: "stream_error",
      message_ar: "انقطع الاتصال أثناء المحادثة.",
      message_en: err instanceof Error ? err.message : String(err),
    });
  }
}

function handleFrame(frame: string, callbacks: ChatStreamCallbacks): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  const dataStr = dataLines.join("\n");
  if (!dataStr) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataStr);
  } catch {
    // Some SSE servers emit raw text payloads — best-effort fallback.
    if (event === "delta") callbacks.onDelta(dataStr);
    return;
  }

  switch (event) {
    case "rate_limit": {
      if (
        typeof payload === "object" &&
        payload &&
        "limit" in payload &&
        "remaining" in payload &&
        "reset_at" in payload
      ) {
        callbacks.onRateLimit?.(payload as RateLimitInfo);
      }
      return;
    }
    case "delta": {
      if (typeof payload === "object" && payload && "text" in payload) {
        const text = (payload as { text: unknown }).text;
        if (typeof text === "string") callbacks.onDelta(text);
      }
      return;
    }
    case "error": {
      if (typeof payload === "object" && payload) {
        const p = payload as Partial<{
          error: string;
          message_ar: string;
          message_en: string;
        }>;
        callbacks.onError?.({
          error: p.error ?? "stream_error",
          message_ar: p.message_ar ?? "حدث خطأ.",
          message_en: p.message_en ?? "An error occurred.",
        });
      }
      return;
    }
    case "done":
      callbacks.onDone?.();
      return;
    default:
      // Unknown event types are ignored by design.
      return;
  }
}
