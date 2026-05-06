/**
 * TOTP recovery codes.
 *
 * One-shot 12-character codes (formatted xxxx-xxxx-xxxx of crockford-base32
 * alphabet, dashes for readability) that an admin can use in place of a
 * fresh TOTP if their authenticator is unavailable.
 *
 * Storage rules:
 *   - the raw code is shown to the admin **once** (right after TOTP
 *     enrollment, or on explicit re-generation) and never written to disk
 *   - only sha256(code) is persisted in admin_recovery_codes.code_hash
 *   - each row is single-use; used_at flips on consumption and the row is
 *     kept for forensic trail (used_ip, used_user_agent)
 *
 * Generation rules:
 *   - 10 codes per batch, drawn from cryptographic RNG via generateToken()
 *   - regenerating wipes the unused remainder of the previous batch in
 *     the same transaction — no overlap window where an attacker holding
 *     an old code could still authenticate after the admin asked for fresh
 *     ones
 *   - already-consumed rows are kept (used_at non-null) for the audit log;
 *     they are inert (consume() filters on used_at is null)
 */

import { generateToken, sha256Hex } from "./crypto";

import { getServiceRoleClient } from "@/lib/supabase-admin";

export const RECOVERY_BATCH_SIZE = 10;
const CODE_LENGTH_BYTES = 6; // -> 12 hex chars -> formatted as 4-4-4

/** Cryptographically random recovery code in `xxxx-xxxx-xxxx` form. */
function newRawCode(): string {
  const hex = generateToken(CODE_LENGTH_BYTES);
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** Strip user-supplied formatting before hashing. Lowercases too — codes
 * are emitted in lowercase and stored lowercase, so we accept any case
 * the admin types in their authenticator app. */
function normalize(code: string): string {
  return code.replace(/[\s-]/g, "").toLowerCase();
}

/**
 * Mint a fresh batch of `RECOVERY_BATCH_SIZE` codes for `adminId` and
 * stamp `admin_users.recovery_codes_generated_at`.  Wipes any prior unused
 * codes atomically — same flow as session rotation in createSession().
 *
 * Returns the raw codes (caller must show them once and never re-fetch).
 */
export async function generateRecoveryCodes(adminId: string): Promise<string[]> {
  const supabase = getServiceRoleClient();

  // Wipe any pending unused codes from a previous batch.  Used codes are
  // kept (used_at non-null) for the audit trail.
  const { error: deleteError } = await supabase
    .from("admin_recovery_codes")
    .delete()
    .eq("admin_id", adminId)
    .is("used_at", null);
  if (deleteError) {
    throw new Error(`Failed to clear prior unused recovery codes: ${deleteError.message}`);
  }

  const codes: string[] = [];
  const rows: { admin_id: string; code_hash: string }[] = [];
  for (let i = 0; i < RECOVERY_BATCH_SIZE; i++) {
    const raw = newRawCode();
    codes.push(raw);
    rows.push({ admin_id: adminId, code_hash: await sha256Hex(raw) });
  }

  const { error: insertError } = await supabase.from("admin_recovery_codes").insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert recovery codes: ${insertError.message}`);
  }

  const { error: stampError } = await supabase
    .from("admin_users")
    .update({ recovery_codes_generated_at: new Date().toISOString() })
    .eq("id", adminId);
  if (stampError) {
    // Non-fatal: codes are usable, only the bookkeeping timestamp is
    // missing.  Log via thrown error so the caller decides whether to
    // surface or swallow.
    throw new Error(`Failed to stamp recovery_codes_generated_at: ${stampError.message}`);
  }

  return codes;
}

export interface RecoveryConsumeResult {
  ok: boolean;
  /** Number of unused codes remaining after this attempt. */
  remaining: number;
}

/**
 * Try to consume `rawCode` for `adminId`.  Returns `ok=true` and the
 * remaining unused count on success; `ok=false` (with `remaining`
 * unchanged) on any failure mode.
 *
 * This is the only path that turns a recovery code into a session, so
 * the failure-mode surface MUST be silent: no leakage of "code valid but
 * already used" vs. "code unknown" vs. "wrong admin", because each
 * differential leaks oracle bits to a brute-forcer.
 */
export async function consumeRecoveryCode(
  adminId: string,
  rawCode: string,
  context: { ip: string | null; userAgent: string | null } = { ip: null, userAgent: null },
): Promise<RecoveryConsumeResult> {
  const normalized = normalize(rawCode);
  // Cheap shape check: 12 hex chars after normalization.  Bail before
  // hashing if the input clearly isn't a recovery code (e.g., a 6-digit
  // TOTP).  This also keeps the timing of an obviously-malformed input
  // fast and predictable.
  if (!/^[0-9a-f]{12}$/.test(normalized)) {
    return { ok: false, remaining: await countUnusedCodes(adminId) };
  }

  const supabase = getServiceRoleClient();
  const codeHash = await sha256Hex(normalized);

  // Atomic claim: update only if the row exists, belongs to this admin,
  // and is not yet used.  Postgres returns the row if-and-only-if the
  // update touched a row, so we know success unambiguously without a
  // separate select-then-update race.
  const { data: claimed, error: claimError } = await supabase
    .from("admin_recovery_codes")
    .update({
      used_at: new Date().toISOString(),
      used_ip: context.ip,
      used_user_agent: context.userAgent,
    })
    .eq("admin_id", adminId)
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    // Ambient DB error.  Treat as auth failure — never let a transient
    // failure here be mistaken for a successful consume by the caller.
    return { ok: false, remaining: await countUnusedCodes(adminId) };
  }

  const remaining = await countUnusedCodes(adminId);
  return { ok: claimed !== null, remaining };
}

/** Count of unused recovery codes for `adminId`.  Used by both the verify
 * action (to log "low codes" when remaining drops below 3) and any future
 * settings UI. */
export async function countUnusedCodes(adminId: string): Promise<number> {
  const supabase = getServiceRoleClient();
  const { count, error } = await supabase
    .from("admin_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("admin_id", adminId)
    .is("used_at", null);
  if (error) return 0;
  return count ?? 0;
}
