import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@seerah/types";

import {
  PENDING_COOKIE,
  PENDING_PREFIXES,
  PENDING_TTL_SECONDS,
  PUBLIC_PREFIXES,
  SESSION_COOKIE,
} from "@/lib/auth/constants";
import { sha256Hex } from "@/lib/auth/crypto";
import { verifyPendingToken } from "@/lib/auth/pending";
import { extractClientIp, isIpAllowed, type AllowlistEntry } from "@/lib/ip";

export const config = {
  // Run on every page and API route except Next internals + static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)"],
};

interface AllowlistCache {
  rules: AllowlistEntry[] | null;
  expiresAt: number;
}

let allowlistCache: AllowlistCache | null = null;
let edgeClient: SupabaseClient<Database> | null = null;

function getEdgeClient(): SupabaseClient<Database> | null {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  if (edgeClient) return edgeClient;
  edgeClient = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return edgeClient;
}

async function loadAllowlist(): Promise<AllowlistEntry[] | null> {
  const now = Date.now();
  if (allowlistCache && allowlistCache.expiresAt > now) return allowlistCache.rules;

  const client = getEdgeClient();
  if (!client) return [];

  const { data, error } = await client
    .from("admin_ip_allowlist")
    .select("cidr")
    .eq("is_active", true);

  const rules = error ? null : ((data ?? []) as AllowlistEntry[]);
  allowlistCache = { rules, expiresAt: now + 60_000 };
  return rules;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPendingPath(pathname: string): boolean {
  return PENDING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -- IP allowlist (applies to every route, including /login) ---------------
  const ip = extractClientIp(request.headers);
  const allowlist = await loadAllowlist();
  if (allowlist === null) {
    // DB unreachable from middleware — fail open with a server-side log so a
    // transient outage doesn't lock everyone out, but record it.
    // eslint-disable-next-line no-console
    console.warn("[admin-middleware] allowlist load failed; allowing request");
  } else if (!isIpAllowed(ip, allowlist)) {
    return new NextResponse("Forbidden — admin access denied for this IP", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // -- Pending-state routes require the short-lived pending cookie ----------
  if (isPendingPath(pathname)) {
    const pending = request.cookies.get(PENDING_COOKIE)?.value;
    if (!pending) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const verified = await verifyPendingToken(pending, PENDING_TTL_SECONDS);
    if (!verified) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(PENDING_COOKIE);
      return response;
    }
    return NextResponse.next();
  }

  // -- Login + other public auth endpoints --------------------------------
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // -- Everything else: full session required ----------------------------
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const client = getEdgeClient();
  if (!client) {
    // No Supabase env in middleware — bail to login rather than silently
    // letting unauthenticated traffic through.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const tokenHash = await sha256Hex(sessionToken);
  const { data: session, error: sessionError } = await client
    .from("admin_sessions")
    .select("id, admin_id, expires_at, last_seen_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    sessionError ||
    !session ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const { data: admin, error: adminError } = await client
    .from("admin_users")
    .select("id, is_active")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (adminError || !admin || !admin.is_active) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Bump last_seen_at if the row hasn't been touched in 60 s. Avoids hot
  // writes when an admin clicks through many pages quickly.
  const lastSeen = new Date(session.last_seen_at).getTime();
  if (Date.now() - lastSeen > 60_000) {
    await client
      .from("admin_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return NextResponse.next();
}
