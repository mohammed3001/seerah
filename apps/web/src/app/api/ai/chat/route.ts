/**
 * SSE proxy from the browser to the FastAPI `/ai/chat` endpoint.
 *
 * Server actions don't support streaming responses, so chat goes through a
 * route handler. We attach the internal token + caller info server-side and
 * forward the raw `text/event-stream` body to the client as-is.
 */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { getAIServiceConfig } from "@/lib/ai/server";
import type { ChatMessage, Language } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRouteBody {
  messages: ChatMessage[];
  resume_context?: Record<string, unknown> | null;
  language: Language;
}

export async function POST(request: Request): Promise<Response> {
  const session = await getDashboardSession();

  let body: ChatRouteBody;
  try {
    body = (await request.json()) as ChatRouteBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages_required" }, { status: 400 });
  }

  const { url, internalToken } = getAIServiceConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (internalToken) headers["Authorization"] = `Bearer ${internalToken}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${url}/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        caller: { user_id: session.userId, plan: session.profile.plan },
        messages: body.messages,
        resume_context: body.resume_context ?? null,
        language: body.language,
      }),
      cache: "no-store",
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        message_ar: "تعذّر الاتصال بخدمة المحادثة.",
        message_en: cause instanceof Error ? cause.message : String(cause),
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || `upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
