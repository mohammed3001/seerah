import "server-only";

import { cookies } from "next/headers";

import { getServiceRoleClient } from "../supabase-admin";

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";
import { generateToken, sha256Hex } from "./crypto";

interface CreateSessionInput {
  adminId: string;
  ip: string | null;
  userAgent: string | null;
}

interface CreatedSession {
  token: string;
  expiresAt: Date;
}

/**
 * Create a server-side admin session row (only the sha256 of the token is
 * persisted) and set the corresponding httpOnly cookie on the current
 * response.
 */
export async function createSession(input: CreateSessionInput): Promise<CreatedSession> {
  const supabase = getServiceRoleClient();
  const token = generateToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

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
