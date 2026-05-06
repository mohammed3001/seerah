/**
 * Shared helpers for the per-action AI route handlers.
 *
 * The web app calls AI via server actions (`apps/web/src/lib/ai/actions.ts`)
 * because RSC pages can co-locate the call with form post handling. The
 * mobile client cannot call server actions, so it uses these route handlers
 * which forward to the same FastAPI endpoints with the same caller-trust
 * model (caller is derived from the Supabase session, never the client).
 */

import { NextResponse } from "next/server";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { AIServiceError, aiServer } from "@/lib/ai/server";
import type { AIResult, RateLimitInfo } from "@/lib/ai/types";
import { assertSameOrigin } from "@/lib/security/origin";

interface OkBody<T> {
  data: T;
  rate_limit: RateLimitInfo | null;
}

/**
 * Resolves the caller from the Supabase session, calls the FastAPI endpoint
 * via `aiServer`, and shapes the response so the mobile client gets a
 * consistent envelope ({ data, rate_limit } on success, { error, … } on
 * failure with a real status code).
 */
export async function handleAIRoute<TInput, TOutput>(
  request: Request,
  caller: (
    input: TInput,
    callerArg: { user_id: string; plan: "free" | "prime" | "enterprise" },
  ) => Promise<AIResult<TOutput>>,
): Promise<Response> {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  // getDashboardSession may call Next's redirect() (which throws
  // NEXT_REDIRECT). Resolve it BEFORE the try/catch around aiServer so
  // the redirect propagates instead of being swallowed.
  const session = await getDashboardSession();

  let input: TInput;
  try {
    // Strip any client-supplied `caller` from the parsed body. Every route
    // handler builds its FastAPI payload as `{ caller, ...input }` where
    // `caller` is the server-derived identity. Without this strip, a client
    // posting `{"caller": {"user_id": "victim", "plan": "enterprise"}, ...}`
    // would have its key win the spread (later keys overwrite earlier ones),
    // letting them impersonate any user and force any plan tier — bypassing
    // rate limits and the entire RLS-tied trust model documented above.
    const raw = (await request.json()) as Record<string, unknown>;
    const { caller: _clientCaller, ...safeInput } = raw;
    void _clientCaller;
    input = safeInput as TInput;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await caller(input, {
      user_id: session.userId,
      plan: session.profile.plan,
    });
    const body: OkBody<TOutput> = {
      data: result.data,
      rate_limit: result.rate_limit,
    };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AIServiceError) {
      return NextResponse.json(
        err.body ?? {
          error: "upstream_unavailable",
          message_ar: "تعذّر الاتصال بخدمة الذكاء الاصطناعي. حاول مرة أخرى.",
          message_en: "AI service is unreachable. Please try again.",
        },
        { status: err.status || 502 },
      );
    }
    return NextResponse.json(
      {
        error: "internal_error",
        message_ar: "حدث خطأ غير متوقع.",
        message_en: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export { aiServer };
