# Audit response — 2026-05-01

This file resolves a third-party audit list of "Critical" findings that
was raised against the repo. The audit was run against an out-of-date
snapshot (pre-`infrastructure-tier` work), so most findings are stale.
Each finding is verified against the **current** branch tip and one of
three statuses is recorded:

- `RESOLVED` — already fixed in a merged PR; the snapshot the audit ran
  against did not include it.
- `FIXED IN THIS PR` — a real gap that this PR closes.
- `NOT A REAL ISSUE` — the finding is conceptually wrong; reasoning recorded.

This is the same auditing pattern used in `docs/audit/X1-final-report.md`
(the Tier-1 audit summary).

---

## Coverage map

| #   | Finding                                                       | File(s)                                                                        | Status                                                                |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | `handle_new_user` trigger is not exercised in CI              | `supabase/migrations/20260501121000_profile_handler.sql`                       | FIXED IN THIS PR                                                      |
| 2   | `pnpm-workspace.yaml` excludes `apps/mobile` (no type bridge) | `pnpm-workspace.yaml`                                                          | NOT A REAL ISSUE                                                      |
| 3   | `ANTHROPIC_MODEL` env var ignored in AI service               | `services/ai/seerah_ai/config.py`                                              | RESOLVED (PR #4)                                                      |
| 4   | AI service has no actual implementation                       | `services/ai/seerah_ai/main.py` + `services/ai/seerah_ai/routes/`              | RESOLVED (PR #4)                                                      |
| 5   | PDF service has no render endpoint                            | `services/pdf/seerah_pdf/main.py` + `services/pdf/seerah_pdf/routes/export.py` | RESOLVED (PRs #7 + #45)                                               |
| 6   | Database types are hand-written placeholders                  | `packages/types/src/database.ts`                                               | RESOLVED                                                              |
| 7   | No auth middleware in Next.js apps                            | `apps/web/src/middleware.ts`, `apps/admin/src/middleware.ts`                   | RESOLVED (PRs #18 + #44)                                              |
| 8   | No SSR Supabase client (`@supabase/ssr` missing)              | `apps/web/src/lib/supabase/{server,browser}.ts`, `packages/api/src/supabase/`  | FIXED IN THIS PR (shared package was stale; apps already SSR-correct) |
| 9   | No Stripe webhook handler                                     | `apps/web/src/app/api/stripe/webhook/route.ts`                                 | RESOLVED (PR #8)                                                      |

---

## Per-finding detail

### 1. `handle_new_user` trigger is not exercised in CI — FIXED IN THIS PR

**Audit claim:** The `handle_new_user` trigger fires on `auth.users INSERT`
but the CI bootstrap creates a mocked `auth` schema without ever inserting
a row, so the trigger is never exercised. A regression here breaks every
flow that joins on `profiles` for a logged-in user (RLS, billing, avatars).

**Verification:** Confirmed. The `supabase-migrations` job in
`.github/workflows/ci.yml` applies all migrations against a fresh
Postgres + the `bootstrap_supabase_schemas.sql` mock, but only ran
`select table_name from information_schema.tables` afterwards. No
test of the trigger itself.

**This PR adds:** `scripts/ci/test_handle_new_user_trigger.sql`, run as
a new CI step after migrations apply. It:

1. Inserts an `auth.users` row with `full_name` + `avatar_url` in
   `raw_user_meta_data`.
2. Asserts `public.profiles` has a row with the matching `id`, `email`,
   `full_name`, `avatar_url`.
3. Verifies the `on conflict (id) do nothing` guard by manually
   overwriting the profile row and re-firing the trigger path —
   the human edit must survive (otherwise a Supabase signup retry
   would silently destroy operator changes).
4. Cleans up after itself so subsequent CI steps see a clean slate.

A regression in `handle_new_user.sql` now fails CI immediately with a
descriptive `RAISE EXCEPTION`.

### 2. `pnpm-workspace.yaml` excludes `apps/mobile` — NOT A REAL ISSUE

**Audit claim:** `apps/mobile` is correctly excluded from the pnpm
workspace, but shared TypeScript types in `@seerah/types` cannot be
referenced from the Flutter side. No bridge layer is defined.

**Why this is wrong:** Flutter is a Dart project. There is no point
including it in a `pnpm` workspace, and TypeScript types do not cross
the language boundary. The mobile app uses Dart classes that mirror
the Postgres schema — drift is mitigated by the shared migration files
(both apps read from `supabase/migrations/`), not by sharing TS types.

If a Dart codegen layer is wanted in the future, it would consume the
migration SQL or a `db gen schema` JSON dump — not `@seerah/types`.
This is documented in the workspace file inline.

### 3. `ANTHROPIC_MODEL` env var ignored — RESOLVED (PR #4)

**Audit claim:** `Settings` loads `ANTHROPIC_MODEL` from env but
`main.py` never uses it.

**Verification:** Stale finding. The AI service was migrated to OpenAI
in PR #4 (Phase 3 Part A). `services/ai/seerah_ai/config.py` no
longer has any Anthropic settings — only `OPENAI_API_KEY`,
`OPENAI_MODEL`, `OPENAI_VISION_MODEL`, `OPENAI_REQUEST_TIMEOUT_S`. The
client lives at `services/ai/seerah_ai/openai_client.py`.

### 4. AI service has no actual AI implementation — RESOLVED (PR #4)

**Audit claim:** Only `/health` is implemented; no rewrite_bio route
exists.

**Verification:** Stale. PR #4 added 7 routers, all wired in
`services/ai/seerah_ai/main.py`:

- `routes/enhance.py` → `/ai/enhance-text`
- `routes/generate.py` → `/ai/generate-section`
- `routes/analyze.py` → `/ai/analyze-resume`
- `routes/smart_fill.py` → `/ai/smart-fill`
- `routes/skills.py` → `/ai/suggest-skills`
- `routes/job_match.py` → `/ai/improve-for-job`
- `routes/chat.py` → `/ai/chat`

Each one has a matching Next.js proxy at `apps/web/src/app/api/ai/<name>/route.ts`.

### 5. PDF service has no render endpoint — RESOLVED (PRs #7 + #45)

**Audit claim:** `PdfServiceClient.renderResume()` is defined but the
FastAPI service only exposes `/health`.

**Verification:** Stale. PR #7 (Phase 4) shipped the render engine:

- `services/pdf/seerah_pdf/main.py` — FastAPI app with Playwright warm-start lifespan
- `services/pdf/seerah_pdf/routes/export.py` — render router
- `services/pdf/seerah_pdf/renderer.py` — headless Chromium driver
- `services/pdf/seerah_pdf/network_guard.py` — SSRF allow-list (added in PR #45)

The renderer is exercised end-to-end every time a Next.js
`/api/export/pdf` or `/api/export/png` route is hit.

### 6. Database types are hand-written placeholders — RESOLVED

**Audit claim:** `Database` interface only covers `profiles` and `resumes`
but migrations define 15+ tables. TypeScript types are massively incomplete.

**Verification:** Stale. `packages/types/src/database.ts` is **910 lines**
and mirrors every public table: `profiles`, `resumes`, `personal_info`,
`education`, `experience`, `skills`, `languages`, `courses`, `projects`,
`references`, `social_links`, `hobbies`, `address`, `templates`,
`subscriptions`, `support_tickets`, `ai_usage`, `resume_views`,
`admin_users`, `admin_audit_log`, `admin_recovery_codes`,
`admin_ip_allowlist`, `admin_sessions`, plus all RPC and view types.

The header comment notes the file should be regenerated via
`pnpm dlx supabase gen types typescript`. Not yet wired into a turbo
task — that is tracked separately as a non-Critical improvement.

### 7. No auth middleware anywhere in Next.js apps — RESOLVED (PRs #18, #44)

**Audit claim:** No `middleware.ts` file in either app. No route
protection. The service-role client could be instantiated in a browser
component if imported incorrectly.

**Verification:** Stale. Both apps have full middleware:

- `apps/web/src/middleware.ts` — uses `@supabase/ssr` `createServerClient`,
  redirects unauthenticated users from `/dashboard/*` to `/auth/login`,
  and redirects authenticated users away from auth pages.
- `apps/admin/src/middleware.ts` — IP allow-list, pending-cookie gating
  for `/2fa/*`, full opaque-session lookup against `admin_sessions`,
  and admin-active check. Session rotation on TOTP success was added
  in PR #44, recovery codes in PR #46.

The service-role client is not browser-exposed: it imports
`server-only` and lives behind `@supabase/api/supabase/service-role`
(server-only by convention — also each app has its own
`apps/<app>/src/lib/supabase/service-role.ts` for clarity).

### 8. No SSR Supabase client (`@supabase/ssr` missing) — FIXED IN THIS PR

**Audit claim:** `packages/api/src/supabase/browser.ts` uses plain
`@supabase/supabase-js` `createClient` with `persistSession:true`. SSR
components have no session.

**Verification (apps):** App code is **already correct**. Both Next.js
apps use `@supabase/ssr` directly:

- `apps/web/src/lib/supabase/{server,browser}.ts` — wraps
  `createBrowserClient` and `createServerClient` from `@supabase/ssr`.
- `apps/web/src/middleware.ts` — uses `createServerClient`.

**Verification (shared package):** The `@seerah/api/supabase` shared
clients (`packages/api/src/supabase/`) were **stale** — they still
used plain `@supabase/supabase-js` with the comment "SSR cookie
integration via `@supabase/ssr` will be added when auth flows land."
No app code imports from this path (`grep -r '@seerah/api/supabase'`
returns zero hits across `apps/`). It was dead code, but a future
contributor importing from the shared package would silently get the
wrong client.

**This PR:**

1. Updates `packages/api/src/supabase/browser.ts` to wrap
   `@supabase/ssr`'s `createBrowserClient`.
2. Adds `packages/api/src/supabase/server.ts` exporting a
   `createServerClient(cookies)` helper that's framework-agnostic
   (cookies adapter passed in by the caller).
3. Re-exports both from `packages/api/src/supabase/index.ts`.
4. Adds `@supabase/ssr` to `packages/api`'s dependencies.

### 9. No Stripe webhook handler — RESOLVED (PR #8)

**Audit claim:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are in
`.env.example` but no webhook route exists. Subscription status will
never update.

**Verification:** Stale. PR #8 (Phase 5) shipped a complete webhook
handler at `apps/web/src/app/api/stripe/webhook/route.ts` (301 lines):

- Raw-body signature verification with `stripe.webhooks.constructEvent`.
- Idempotency via `subscriptions.last_event_id`.
- Handles `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.payment_failed`.
- `profiles.plan` is updated transactively via the `trg_sync_profile_plan`
  trigger on the `subscriptions` table.

Paddle is intentionally not implemented — Stripe is the production
provider. The Paddle env-var stubs in `.env.example` are reserved for
a future expansion but unused today.

---

## Overall result

- **9 Critical findings reviewed.**
- **6 stale** (already resolved in merged PRs).
- **2 fixed in this PR** (handle_new_user CI test, shared SSR client).
- **1 not a real issue** (Flutter type bridge — language boundary).
- **0 Criticals open.**
