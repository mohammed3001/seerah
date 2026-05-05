/**
 * Per-table column allowlists for the resume editor.
 *
 * Audit F1 (mass-assignment): The editor's server actions used to forward
 * any `Record<string, unknown>` patch the client supplied straight to
 * Supabase.  Even though the client UI only sends the fields the user can
 * legitimately edit, "use server" actions are callable as plain HTTP
 * endpoints — a malicious caller can post `{ resume_id: "victim-id" }`
 * to a section update and re-parent it to someone else's resume, or
 * include `id`, `created_at`, or `user_id` to forge audit metadata.
 *
 * Every server action that writes to one of these tables MUST run the
 * patch through `pickAllowed(table, patch)` before forwarding to
 * Supabase.  The allowlist explicitly excludes:
 *
 *   - `id` (assigned by the database)
 *   - `resume_id` (set once at insert; clients must never change it)
 *   - `user_id` (set once at signup; clients must never change it)
 *   - `created_at`, `updated_at` (managed by Postgres)
 *   - `views_count`, `completion_score` (computed server-side)
 *
 * If you add a new editable column to the schema, you MUST add it to the
 * matching allowlist below — the column will be silently dropped from
 * client patches otherwise (which is the safe default).
 */

/** Keys allowed when editing the parent `resumes` row from the dashboard. */
export const RESUMES_META_ALLOWED = [
  "title",
  "language",
  "template_id",
  "is_public",
  "hide_from_search",
  "section_order",
  "section_labels",
  "hidden_fields",
  "show_education_first",
] as const;

export type ResumesMetaAllowedKey = (typeof RESUMES_META_ALLOWED)[number];

/**
 * Allowlist for each per-section table.  Keep these in sync with
 * `supabase/migrations/20260501120300_resume_sections.sql`.
 */
export const SECTION_FIELD_ALLOWLIST: Record<string, ReadonlyArray<string>> = {
  personal_info: [
    "full_name",
    "job_title",
    "bio",
    "email",
    "phone",
    "phone_country_code",
    "website",
    "city",
    "country",
    "nationality",
    "date_of_birth",
    "gender",
    "marital_status",
    "health_status",
    "military_service",
    "avatar_path",
    "ar",
    "en",
  ],
  address: ["national_address", "ar", "en"],
  education: [
    "institution",
    "degree",
    "field_of_study",
    "start_date",
    "end_date",
    "description",
    "is_visible",
    "sort_order",
    "ar",
    "en",
  ],
  experience: [
    "company",
    "job_title",
    "start_date",
    "end_date",
    "is_current",
    "description",
    "is_visible",
    "sort_order",
    "ar",
    "en",
  ],
  skills: ["name", "level", "is_visible", "sort_order"],
  languages: [
    "language_name",
    "fluency",
    "is_sign_language",
    "is_visible",
    "sort_order",
  ],
  courses: [
    "name",
    "institution",
    "start_date",
    "end_date",
    "is_current",
    "description",
    "is_visible",
    "sort_order",
    "ar",
    "en",
  ],
  projects: [
    "name",
    "url",
    "start_date",
    "end_date",
    "is_current",
    "description",
    "is_visible",
    "sort_order",
    "ar",
    "en",
  ],
  references: [
    "name",
    "email",
    "phone",
    "phone_country_code",
    "description",
    "is_visible",
    "sort_order",
    "ar",
    "en",
  ],
  social_links: ["url", "link_type", "is_visible", "sort_order"],
  hobbies: ["name", "is_visible", "sort_order", "ar", "en"],
};

/**
 * Filters a client-supplied patch down to columns that exist in the
 * allowlist for `table`.  Unknown / forbidden keys are silently
 * dropped — by design.  We do not throw because the client may legitimately
 * carry over extra computed fields (e.g. UI-only state) that should just
 * be ignored on the server.
 *
 * Returns a fresh object; the input is never mutated.
 */
export function pickAllowed<T extends Record<string, unknown>>(
  table: string,
  patch: T,
): Record<string, unknown> {
  const allowed = SECTION_FIELD_ALLOWLIST[table];
  if (!allowed) {
    // Caller passed an unknown table.  Refuse to forward anything — the
    // server action will fail naturally on the missing row, but at
    // least we won't write client-controlled fields into a table the
    // policy doesn't cover.
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      out[key] = patch[key];
    }
  }
  return out;
}

/**
 * Filters a `resumes` meta patch down to the columns the dashboard is
 * allowed to set.  Same semantics as `pickAllowed` but typed against the
 * narrower meta-only allowlist.
 */
export function pickAllowedResumeMeta<T extends Record<string, unknown>>(
  patch: T,
): Partial<Record<ResumesMetaAllowedKey, unknown>> {
  const out: Partial<Record<ResumesMetaAllowedKey, unknown>> = {};
  for (const key of RESUMES_META_ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      out[key] = patch[key];
    }
  }
  return out;
}
