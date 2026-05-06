"use server";

import { buildStorageKey, validateImageUpload } from "@seerah/api/security";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const AVATAR_MAX_BYTES = 4 * 1024 * 1024; // 4 MB — matches the previous client-side limit.

export interface UploadAvatarResult {
  ok: boolean;
  /** Storage object path on success; pass to publicAvatarUrl(). */
  path?: string;
  /** Arabic message for the toast on success or failure. */
  message: string;
}

/**
 * Server action that validates an avatar upload's magic bytes and writes
 * it to the `avatars` bucket via the service role.
 *
 * Why server-side?  The browser-supplied `File.type` is attacker-
 * controlled — a `.exe` renamed to `.png` and announced as `image/png`
 * would otherwise land in our public bucket and be served back with
 * `Content-Type: image/png`, which is a stored-XSS / abuse-of-storage
 * vector.  This action discards the client's MIME entirely; only the
 * detected canonical MIME (PNG / JPEG / WebP) is written to the object.
 *
 * Object keys are `{user_id}/{uuid}.{ext}` — the resume id is
 * intentionally NOT in the path so a leaked URL can't be used to map
 * back to a specific resume, and the v4 UUID makes enumeration of
 * other users' avatars impossible.
 */
export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarResult> {
  // Auth resolution must run OUTSIDE try/catch — getDashboardSession()
  // calls Next's redirect() for unauthenticated users, which works by
  // throwing a NEXT_REDIRECT error.  Catching it would swallow the
  // redirect and silently turn it into a generic "log in first" toast.
  // We also do not want to hide non-redirect failures (e.g. a Supabase
  // outage) behind the same toast — let them surface naturally.
  const session = await getDashboardSession();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "لم يتم اختيار ملف." };
  }

  const result = await validateImageUpload(file, {
    maxBytes: AVATAR_MAX_BYTES,
  });
  if (!result.ok) {
    return { ok: false, message: result.messageAr };
  }

  const objectKey = buildStorageKey(session.userId, result.detection.ext);

  const supabase = getServiceRoleClient();
  const { error } = await supabase.storage.from("avatars").upload(objectKey, result.buffer, {
    contentType: result.detection.mime,
    // Avatars are addressable by UUID-suffixed keys; collisions are
    // statistically impossible, so upsert=false catches storage bugs
    // rather than silently overwriting another user's file.
    upsert: false,
  });
  if (error) {
    return { ok: false, message: `تعذّر رفع الصورة: ${error.message}` };
  }

  return { ok: true, path: objectKey, message: "تم تحديث الصورة" };
}
