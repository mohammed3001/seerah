/**
 * IP-based rate limiting for Next.js API routes.
 *
 * This is **separate from** the per-user quota limiter that lives in the
 * AI / PDF services (`services/ai/seerah_ai/rate_limiter.py`). That
 * limiter caps *successful business calls* (e.g. "10 AI enhancements per
 * day on the free plan"). This one caps *raw HTTP requests per IP* so
 * an unauthenticated attacker cannot exhaust our network / CPU budget
 * before traffic ever reaches the upstream service.
 *
 * Backed by Upstash Redis REST. No-ops gracefully if
 * `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset, so
 * dev / preview deploys keep working without the secret.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REDIS_URL = process.env["UPSTASH_REDIS_REST_URL"] ?? "";
const REDIS_TOKEN = process.env["UPSTASH_REDIS_REST_TOKEN"] ?? "";

const redis: Redis | null =
  REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

/**
 * One Ratelimit instance per logical "scope" so different routes can
 * have different budgets. `prefix` namespaces the Redis keys so a noisy
 * AI client doesn't burn through the export budget.
 */
const limiters = new Map<string, Ratelimit>();

export type RateLimitScope = "ai" | "export" | "email" | "stripe" | "default";

/**
 * Sliding-window budgets per scope. Tuned for "block obvious abuse, do
 * not affect any real user". Real users hit the per-user quota limiter
 * downstream long before they hit these.
 */
const BUDGETS: Record<RateLimitScope, { tokens: number; windowSeconds: number }> = {
  ai: { tokens: 60, windowSeconds: 60 }, // 60/minute per IP — well above any human's pace
  export: { tokens: 30, windowSeconds: 60 }, // 30/minute per IP — PDF rendering is heavy
  email: { tokens: 10, windowSeconds: 60 }, // 10/minute per IP
  stripe: { tokens: 30, windowSeconds: 60 }, // checkout / portal redirects
  default: { tokens: 120, windowSeconds: 60 },
};

function getLimiter(scope: RateLimitScope): Ratelimit | null {
  if (!redis) return null;
  let cached = limiters.get(scope);
  if (cached) return cached;
  const { tokens, windowSeconds } = BUDGETS[scope];
  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, `${windowSeconds} s`),
    prefix: `seerah:rl:${scope}`,
    analytics: false,
  });
  limiters.set(scope, cached);
  return cached;
}

/**
 * Best-effort client IP. Returns `unknown` if every header is absent —
 * we still want a rate-limit key so a single misconfigured proxy
 * doesn't disable all protection.
 */
function ipFromRequest(request: NextRequest | Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // The first entry is the original client; everything after is a hop.
    return forwarded.split(",")[0]!.trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Throttle a single request. Returns:
 *   - `null` if the request is allowed (caller continues normally)
 *   - a `Response` (HTTP 429) if the request is denied (caller returns
 *     this directly)
 *
 * Always returns `null` when Upstash is not configured — see module
 * docstring for rationale.
 */
export async function enforceIpRateLimit(
  request: NextRequest | Request,
  scope: RateLimitScope = "default",
): Promise<Response | null> {
  const limiter = getLimiter(scope);
  if (!limiter) return null;

  const ip = ipFromRequest(request);
  const result = await limiter.limit(ip);

  if (result.success) return null;

  return NextResponse.json(
    {
      error: "rate_limited",
      message_ar: "عدد الطلبات كبير. حاول بعد قليل.",
      message_en: "Too many requests. Please slow down.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)).toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": Math.max(0, result.remaining).toString(),
        "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
      },
    },
  );
}
