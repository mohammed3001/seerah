import "server-only";

import { NextResponse } from "next/server";

/**
 * Same-origin guard for state-changing admin API routes.
 *
 * The admin app calls a small number of cross-origin endpoints on the
 * web app (notify-reply, notify-resolve), so this guard does NOT govern
 * outbound requests — it gates inbound state-changing requests to admin
 * routes (currently just /api/auth/logout).  Server actions are
 * cross-origin-protected by Next.js itself; this helper exists for the
 * route handlers we own.
 */
function buildConfiguredOrigins(): Set<string> {
  const set = new Set<string>();
  const adminUrl = process.env["ADMIN_APP_URL"];
  if (adminUrl) set.add(adminUrl.replace(/\/$/, ""));
  // Localhost convenience for `pnpm dev`.
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3001");
    set.add("http://127.0.0.1:3001");
  }
  return set;
}

let cachedConfigured: Set<string> | null = null;

function getConfiguredOrigins(): Set<string> {
  if (cachedConfigured === null) cachedConfigured = buildConfiguredOrigins();
  return cachedConfigured;
}

/**
 * The request's own origin, derived from the URL Next.js routes to us.
 * Always allowed — same-origin POSTs cannot be forged by a different
 * site, and a foreign Origin will never match the request's actual host.
 */
function selfOriginFromRequest(req: Request): string | null {
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Returns a 403 NextResponse if the request's Origin does not match the
 * admin app's origin.  Returns null when the request is allowed.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  const isStateChanging = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (!isStateChanging) return null;

  const origin = req.headers.get("origin");
  if (!origin) return null; // server-to-server / non-browser caller

  // Always allow the request's own origin so the guard never fails
  // closed when `ADMIN_APP_URL` is unset.  Modern browsers send Origin
  // on same-origin POSTs (Chrome 76+, Firefox 70+); an empty allowlist
  // would otherwise 403 every legitimate admin form submission.
  const self = selfOriginFromRequest(req);
  if (self && origin === self) return null;

  const allowed = getConfiguredOrigins();
  if (!allowed.has(origin)) {
    return NextResponse.json({ error: "invalid_origin", code: "INVALID_ORIGIN" }, { status: 403 });
  }
  return null;
}
