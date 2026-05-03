import "server-only";

import type { Json } from "@seerah/types";

import { getServiceRoleClient } from "./supabase-admin";

interface AuditInput {
  adminId: string | null;
  adminEmail: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Write an entry to admin_audit_log via the security-definer RPC.  Failures
 * are swallowed and logged to console — auditing must never block the
 * primary admin action (e.g. a user's account stays disabled even if the
 * audit insert times out).  Production should hook console errors into
 * whatever observability stack is wired up.
 */
export async function logAdminAction(input: AuditInput): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("log_admin_action", {
    p_admin_id: input.adminId,
    p_admin_email: input.adminEmail,
    p_action: input.action,
    p_target_type: input.targetType ?? null,
    p_target_id: input.targetId ?? null,
    p_metadata: (input.metadata ?? {}) as Json,
    p_ip: input.ip ?? null,
    p_user_agent: input.userAgent ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[admin-audit] failed to log action", input.action, error);
  }
}
