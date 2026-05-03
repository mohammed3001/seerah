import "server-only";

import { cookies } from "next/headers";

import type { Tables } from "@seerah/types";

import { getServiceRoleClient } from "../supabase-admin";

import { SESSION_COOKIE } from "./constants";
import { sha256Hex } from "./crypto";

export type AdminSummary = Pick<
  Tables<"admin_users">,
  | "id"
  | "email"
  | "role"
  | "is_active"
  | "totp_verified_at"
  | "last_login_at"
>;

export interface CurrentAdminContext {
  admin: AdminSummary;
  session: {
    id: string;
    expires_at: string;
    last_seen_at: string;
  };
}

/**
 * Resolve the current admin from the session cookie. Returns null if there
 * is no cookie, the session is expired/revoked, or the admin has been
 * disabled.  Does NOT redirect — callers should handle the null case
 * (typically by calling `redirect('/login')`).
 *
 * The middleware already guards every non-public route, so by the time a
 * Server Component or Server Action calls this it should always succeed.
 * Treat null as a defensive fallback.
 */
export async function getCurrentAdmin(): Promise<CurrentAdminContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const supabase = getServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from("admin_sessions")
    .select("id, admin_id, expires_at, last_seen_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Failed to load admin session: ${sessionError.message}`);
  }
  if (!session) return null;
  if (session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active, totp_verified_at, last_login_at")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (adminError) {
    throw new Error(`Failed to load admin: ${adminError.message}`);
  }
  if (!admin || !admin.is_active) return null;

  return {
    admin,
    session: {
      id: session.id,
      expires_at: session.expires_at,
      last_seen_at: session.last_seen_at,
    },
  };
}
