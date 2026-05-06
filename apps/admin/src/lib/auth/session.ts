import "server-only";

import { cookies } from "next/headers";

import { getServiceRoleClient } from "../supabase-admin";

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";
import { generateToken, sha256Hex } from "./crypto";

interface CreateSessionInput {
  adminId: string;
  ip: string | null;
  userAgent: string | null;
  /**
   * When true (default for the explicit auth flows — login + TOTP — which
   * are the only callers today), revoke every currently active admin_sessions
   * row for `adminId` *before* inserting the new session row.  This is the
   * server-side counterpart to "regenerate session ID on auth success" and
   * defends against:
   *   - stolen tokens that have not yet hit their natural TTL
   *   - session-fixation attempts where an attacker plants a session cookie
   *     and waits for the legitimate admin to authenticate
   *   - leftover sessions from a previous admin device the operator has
   *     since lost / replaced
   *
   * Pass `false` only if there is a deliberate reason to keep prior
   * sessions alive across this createSession call.  No caller does today.
   */
  rotatePriorSessions?: boolean;
}

interface CreatedSession {
  token: string;
  expiresAt: Date;
}

/**
 * Create a server-side admin session row (only the sha256 of the token is
 * persisted) and set the corresponding httpOnly cookie on the current
 * response.
 *
 * By default this also revokes all other active sessions for the admin —
 * see `rotatePriorSessions` on the input for the reasoning.
 */
export async function createSession(input: CreateSessionInput): Promise<CreatedSession> {
  const supabase = getServiceRoleClient();
  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  if (input.rotatePriorSessions !== false) {
    // Forward-only: existing sessions are marked revoked but kept around
    // for audit-log forensics (they remain in admin_sessions with revoked_at
    // set).  Failure here MUST NOT silently fall through, otherwise a fresh
    // login would not invalidate a stolen token.
    const { error: revokeError } = await supabase
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("admin_id", input.adminId)
      .is("revoked_at", null);
    if (revokeError) {
      throw new Error(
        `Failed to revoke prior admin sessions during rotation: ${revokeError.message}`,
      );
    }
  }

  const { error } = await supabase.from("admin_sessions").insert({
    admin_id: input.adminId,
    token_hash: tokenHash,
    ip: input.ip,
    user_agent: input.userAgent,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    throw new Error(`Failed to create admin session: ${error.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return { token, expiresAt };
}

/** Revoke the current session (if any) and clear the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const supabase = getServiceRoleClient();
    const tokenHash = await sha256Hex(token);
    await supabase
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .is("revoked_at", null);
  }
  cookieStore.delete(SESSION_COOKIE);
}
