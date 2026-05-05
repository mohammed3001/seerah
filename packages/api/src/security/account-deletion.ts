/**
 * Account deletion — storage cleanup helper.
 *
 * The Postgres FK graph already cascades cleanly when an `auth.users`
 * row is deleted:
 *
 *   auth.users  →  profiles            (on delete cascade)
 *   profiles    →  resumes             (cascade via user_id)
 *   resumes     →  personal_info,
 *                  education,
 *                  experience,
 *                  ... (every section table)  (cascade via resume_id)
 *   profiles    →  subscriptions, referrals,
 *                  email_preferences,
 *                  email_logs (set null),
 *                  support_tickets (set null),
 *                  resume_views (set null), ...
 *
 * What does NOT cascade is **storage** — files written to Supabase
 * Storage buckets via the service role do not have foreign-key
 * relationships to the `auth.users` row.  Without an explicit cleanup
 * pass before `auth.admin.deleteUser`, every avatar the user ever
 * uploaded stays in the `avatars` bucket forever, addressable by
 * anyone who guesses the URL (the bucket is public-read).
 *
 * Audit S3 standardised the storage layout to:
 *
 *   avatars/{user_id}/{uuid}.{png|jpg|webp}
 *   attachments/{user_id}/{...}        (private, support uploads)
 *
 * — that is, every user-owned object lives under `{user_id}/...`.
 * This module sweeps both buckets for the user's prefix and deletes
 * everything found.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AccountDeletionStorageResult {
  /** Number of objects removed from the avatars bucket. */
  avatars: number;
  /** Number of objects removed from the attachments bucket. */
  attachments: number;
  /** Per-bucket non-fatal errors (the deletion proceeds anyway). */
  errors: string[];
}

/**
 * Lists every object under `{userId}/` in `bucket` and removes them.
 * `list()` returns at most 1000 entries per call, so we loop until
 * the page comes back smaller than the limit.  Empty folders are a
 * no-op.
 *
 * Errors from individual list/remove calls are collected and returned
 * — they are NOT thrown.  Storage cleanup failures should never block
 * the auth-user deletion (orphaned files are recoverable; an undeleted
 * user is a privacy-law incident).
 */
async function purgeBucketPrefix(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
): Promise<{ removed: number; errors: string[] }> {
  const errors: string[] = [];
  let removed = 0;
  // List() max page size is 1000.  Loop until the page is short.
  const PAGE_SIZE = 1000;
  let offset = 0;
  // Hard ceiling to guarantee termination even if list/remove return
  // unexpected shapes (e.g. a bucket policy change starts hiding rows
  // from list but not from remove).  At PAGE_SIZE=1000 this caps
  // sweep work per user at 1M files, which is far above any
  // legitimate avatar/attachment count.
  const MAX_ITERATIONS = 1000;
  for (let iter = 0; iter < MAX_ITERATIONS; iter += 1) {
    // Wrap each fetch in try/catch so transport-level failures
    // (DNS, connection refused, fetch abort) collapse into the
    // returned `errors` array instead of throwing — the public
    // contract is "never block account deletion".
    let listResult: Awaited<ReturnType<ReturnType<SupabaseClient["storage"]["from"]>["list"]>>;
    try {
      listResult = await supabase.storage
        .from(bucket)
        .list(userId, { limit: PAGE_SIZE, offset });
    } catch (err) {
      errors.push(`[${bucket}] list threw: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
    const { data, error } = listResult;
    if (error) {
      errors.push(`[${bucket}] list failed: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    const paths = data.map((entry) => `${userId}/${entry.name}`);
    let removeErr: { message: string } | null = null;
    try {
      const { error: e } = await supabase.storage.from(bucket).remove(paths);
      removeErr = e;
    } catch (err) {
      removeErr = {
        message: `threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (removeErr) {
      errors.push(`[${bucket}] remove failed: ${removeErr.message}`);
      // Advance past the failing window so the next iteration tries
      // a fresh page instead of looping on the same un-removable items.
      offset += PAGE_SIZE;
    } else {
      // On success the deleted entries are gone from the bucket, so
      // the next `list()` call from the SAME offset returns what was
      // previously the *next* page — if we advance offset here we
      // skip an entire page of files (Devin Review on PR #32).
      removed += paths.length;
    }
    if (data.length < PAGE_SIZE) break;
  }
  return { removed, errors };
}

/**
 * Removes every file owned by `userId` from the public `avatars`
 * bucket and the private `attachments` bucket.
 *
 * The supabase client must be the **service role** client; user-bound
 * clients can only delete their own files (per the storage RLS
 * policies in `20260501120800_storage_buckets.sql`), and that's the
 * exact path we want closed off here — by the time a user clicks
 * "delete account" we want the cleanup to run with elevated
 * privileges so a transient session expiry can't leave files behind.
 */
export async function deleteUserStorageArtifacts(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<AccountDeletionStorageResult> {
  // `Promise.allSettled` (not `.all`) so an unexpected throw from one
  // bucket sweep doesn't block the other or — critically — the caller's
  // subsequent `auth.admin.deleteUser` call.  The contract is: storage
  // cleanup never blocks account deletion.  `purgeBucketPrefix` is
  // already defensive internally, but allSettled is belt-and-braces.
  const [avatarsResult, attachmentsResult] = await Promise.allSettled([
    purgeBucketPrefix(supabaseAdmin, "avatars", userId),
    purgeBucketPrefix(supabaseAdmin, "attachments", userId),
  ]);
  const avatars =
    avatarsResult.status === "fulfilled"
      ? avatarsResult.value
      : {
          removed: 0,
          errors: [
            `[avatars] sweep threw: ${
              avatarsResult.reason instanceof Error
                ? avatarsResult.reason.message
                : String(avatarsResult.reason)
            }`,
          ],
        };
  const attachments =
    attachmentsResult.status === "fulfilled"
      ? attachmentsResult.value
      : {
          removed: 0,
          errors: [
            `[attachments] sweep threw: ${
              attachmentsResult.reason instanceof Error
                ? attachmentsResult.reason.message
                : String(attachmentsResult.reason)
            }`,
          ],
        };
  return {
    avatars: avatars.removed,
    attachments: attachments.removed,
    errors: [...avatars.errors, ...attachments.errors],
  };
}
