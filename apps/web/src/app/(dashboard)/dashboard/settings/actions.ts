"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteUserStorageArtifacts } from "@seerah/api/security";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export interface DeleteAccountActionResult {
  ok: boolean;
  message: string;
}

/**
 * `confirm` must equal "DELETE" (case-insensitive, trimmed).  The
 * `email` field is the form's `<input type="email">` and must match
 * the signed-in user's email exactly so the user can't accidentally
 * delete their account by tab-switching from another tab.
 */
const deleteAccountSchema = z.object({
  email: z.string().email(),
  confirm: z.string(),
});

/**
 * Self-service "delete my account" server action.
 *
 * Audit F3: this flow is the user-facing twin of the admin-driven
 * deletion in `apps/admin/src/lib/users/actions.ts`.  Both paths use
 * the same shared storage cleanup helper so storage cascade is
 * impossible to forget.
 *
 * Order of operations matters:
 *   1. Authenticate (NEXT_REDIRECT must run outside try/catch).
 *   2. Validate the type-DELETE confirm AND the email match.
 *   3. Sweep the user's storage prefix (avatars + attachments) — see
 *      the helper for why this has to happen BEFORE the auth row is
 *      gone.
 *   4. `auth.admin.deleteUser` — cascades through the FK graph.
 *   5. Sign the SSR session cookie out so the user lands on /auth/login
 *      cleanly instead of seeing a stale "you are signed in" UI.
 *
 * If the storage sweep returns errors we still proceed with the auth
 * deletion — orphaned files are recoverable; an undeleted user is a
 * privacy-law incident.
 */
export async function deleteOwnAccountAction(
  formData: FormData,
): Promise<DeleteAccountActionResult> {
  // Auth resolution must run OUTSIDE try/catch — getDashboardSession()
  // calls Next's redirect() for unauthenticated users, which works by
  // throwing a NEXT_REDIRECT error.  Catching it would silently turn
  // the redirect into a generic 500.
  const session = await getDashboardSession();

  const parsed = deleteAccountSchema.safeParse({
    email: formData.get("email"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, message: "بيانات النموذج غير صالحة." };
  }

  if (parsed.data.email.trim().toLowerCase() !== session.email.toLowerCase()) {
    return { ok: false, message: "البريد المُدخل لا يطابق حساب الجلسة." };
  }
  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return { ok: false, message: "اكتب DELETE للتأكيد." };
  }

  const admin = getServiceRoleClient();

  // Storage sweep BEFORE auth deletion (see helper docstring).  Errors
  // are collected but never block the auth deletion.
  await deleteUserStorageArtifacts(admin, session.userId);

  const { error } = await admin.auth.admin.deleteUser(session.userId);
  if (error) {
    return { ok: false, message: `تعذّر حذف الحساب: ${error.message}` };
  }

  // Sign the SSR cookie out so the user's browser doesn't carry a
  // dangling Supabase auth cookie back to /auth/login.  Best-effort —
  // the cookie is already orphaned at this point.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/auth/login?deleted=1");
}
