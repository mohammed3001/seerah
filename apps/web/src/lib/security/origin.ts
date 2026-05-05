import "server-only";

import { NextResponse } from "next/server";

/**
 * Same-origin guard for state-changing API routes.
 *
 * Browsers send the `Origin` header on every cross-origin POST/PUT/DELETE
 * (and on same-origin requests too in modern browsers).  By rejecting
 * requests whose Origin does not match our app's origin, we cut off the
 * classic CSRF vector even when our session cookies aren't strictly
 * SameSite-locked (Supabase SSR defaults to `lax`).
 *
 * Usage:
 *
 *   export async function POST(req: Request) {
 *     const blocked = assertSameOrigin(req);
 *     if (blocked) return blocked;
 *     // ...
 *   }
 *
 * NOT to be used on:
 *   - Stripe webhook (POST from Stripe IPs, no Origin header).
 *   - Cron endpoints (POST from Vercel scheduler, authed by CRON_SECRET).
 *   - Email unsubscribe (GET from email-client URL preview / one-click).
 *   - Any route called by another internal service via bearer token (the
 *     bearer-token check is the gate; Origin will not be set).
 */
function buildAllowedOrigins(): Set<string> {
  const set = new Set<string>();
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
  if (appUrl) set.add(appUrl.replace(/\/$/, ""));
  // Admin app posts cross-origin to a few /api/admin/* endpoints; allow
  // its origin when configured.
  const adminUrl = process.env["ADMIN_APP_URL"];
  if (adminUrl) set.add(adminUrl.replace(/\/$/, ""));

  // Localhost convenience for `pnpm dev`.
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3000");
    set.add("http://localhost:3001");
    set.add("http://127.0.0.1:3000");
    set.add("http://127.0.0.1:3001");
  }

  return set;
}

let cachedAllowed: Set<string> | null = null;

function getAllowedOrigins(): Set<string> {
  if (cachedAllowed === null) cachedAllowed = buildAllowedOrigins();
  return cachedAllowed;
}

/**
 * Returns a 403 NextResponse if the request's Origin is set AND does not
 * match any configured app origin.  Returns null otherwise.
 *
 * Rationale:
 *   * Browsers always send `Origin` on cross-origin (and same-origin
 *     since Chrome 76 / Firefox 70) state-changing requests, so an
 *     attacker-controlled origin will always be detected.
 *   * Native mobile clients (Flutter `dio`, RN `fetch`) and server-to-
 *     server callers commonly omit `Origin`; rejecting empty Origin
 *     would break those callers.
 *   * Bearer-authed routes (admin internal, cron) are protected by their
 *     token — Origin would be empty for them anyway.
 *
 * Effect: `<form action="/api/...">` POSTs from attacker.com always have
 * `Origin: https://attacker.com`, which fails the allowlist.  Mobile
 * apps with no Origin pass.  Same-origin requests pass.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  const isStateChanging = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (!isStateChanging) return null;

  const origin = req.headers.get("origin");
  if (!origin) return null; // Native client / server-to-server: no CSRF risk.

  const allowed = getAllowedOrigins();
  if (!allowed.has(origin)) {
    return NextResponse.json(
      { error: "invalid_origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }
  return null;
}
