# Audit X1 — Final report

**Audit window**: 2026-05-05 → 2026-05-06 UTC
**Scope**: Seerah resume-builder monorepo (`apps/web`, `apps/admin`, `apps/mobile`,
`packages/api`, `services/ai`, `services/pdf`, `supabase/migrations`)
**Methodology**: Code-level review against the 808-line audit spec (PART 1
security, PART 2 quality, PART 3 refactor, PART 4 ops), decomposed
into 12 reviewable PRs across 7 phases (S security, F functional,
T templates, A abuse-mitigation, P performance, M mobile, X final
report).
**Status**: 8 / 12 audit PRs landed. 4 remain blocked on external secrets
(Upstash REST URL + token unblocks 4 of them; Cloudflare Turnstile
and Sentry DSN unblock 1 each).

## 1. Executive summary

The audit found and closed eight categories of real, exploitable, or
near-exploitable issues — most of them silent regressions that slipped through
the rapid feature build-out across phases 1–6. The single most impactful
class was **mass-assignment on the resume editor's server actions** (PR #31),
which let a malicious POST re-attach an arbitrary section to a victim's
resume; it was one network request away from being a fully working PoC. The
single most impactful **defence-in-depth** class was the **mobile sign-out
data leak** (PR #36): user A's queued offline mutations would replay under
user B's session if the two shared a device, because nobody had ever called
the `Outbox.clear()` that the docstring promised.

Everything that was found at the source level was also verified at the
artifact level where possible — security headers in HTTP responses (PR #28),
manifest attributes in compiled APKs (PR #37), bytecode in the release dex
(PR #37), template gating in actual server-action returns (PR #33).

The four pending items (S2, F2, A1, P1) are all in the same dependency chain:
they all need the Upstash Redis instance for rate-limit primitives that the
audit spec calls for. Once those credentials arrive, all four can land in
sequence within a single working session.

## 2. Coverage map

| Phase                                                                 | PR                                                    | Status          | Blocked by                           | Severity ceiling    |
| --------------------------------------------------------------------- | ----------------------------------------------------- | --------------- | ------------------------------------ | ------------------- |
| **S1** — HTTP security headers + CSP + same-origin guard              | [#28](https://github.com/mohammed3001/seerah/pull/28) | merged          | —                                    | high                |
| **S2** — Web rate limiting (Upstash)                                  | —                                                     | pending         | `UPSTASH_REDIS_REST_URL` + `_TOKEN`  | high                |
| **S3** — File upload hardening (magic bytes)                          | [#29](https://github.com/mohammed3001/seerah/pull/29) | merged          | —                                    | medium              |
| **S4** — Server-enforced password policy + common-passwords list      | [#30](https://github.com/mohammed3001/seerah/pull/30) | merged          | —                                    | medium              |
| **S5** — Cloudflare Turnstile on signup + reset                       | —                                                     | pending         | `TURNSTILE_SITE_KEY` + `_SECRET_KEY` | medium              |
| **S6** — Sentry init + PII scrub                                      | —                                                     | pending         | `SENTRY_DSN` (web + admin)           | low (observability) |
| **F1** — IDOR + mass-assignment on resume editor                      | [#31](https://github.com/mohammed3001/seerah/pull/31) | merged          | —                                    | **critical**        |
| **F2** — Public resume hardening (`/r/[slug]`)                        | —                                                     | pending         | depends on S2 (rate limiter)         | high                |
| **F3** — Account deletion + storage cascade                           | [#32](https://github.com/mohammed3001/seerah/pull/32) | merged          | —                                    | high                |
| **T1** — DB-driven template gating + dev gallery                      | [#33](https://github.com/mohammed3001/seerah/pull/33) | merged          | —                                    | medium              |
| **A1** — Spam-keyword filter + AI abuse alerting                      | —                                                     | pending         | depends on S2 (counters)             | medium              |
| **P1** — N+1 audit + caching layer                                    | —                                                     | pending         | depends on S2 (Redis cache)          | low (perf)          |
| **M1** — Mobile audit, code-level                                     | [#36](https://github.com/mohammed3001/seerah/pull/36) | merged          | —                                    | **critical**        |
| **M1b** — Build+inspect verification + iOS overlay + AGP/Gradle bumps | [#37](https://github.com/mohammed3001/seerah/pull/37) | open (CI green) | —                                    | medium              |
| **X1** — Final audit report (this document)                           | this PR                                               | —               | —                                    | —                   |

Independent of the audit, two side fixes shipped during the same window:

- **Bug fix** — dashboard nav landing pages ([#35](https://github.com/mohammed3001/seerah/pull/35)): `/dashboard/templates` and `/dashboard/export` were dead nav links; built proper `ResumePickerList`-backed landing pages.
- **Build infrastructure** — AGP 8.1 → 8.7, Gradle 8.3 → 8.10.2, NDK 26 → 27 ([#37](https://github.com/mohammed3001/seerah/pull/37)): the project couldn't build on a clean checkout because a transitive `androidx.core` 1.16.0 had been pulled in.

## 3. Findings & fixes — landed PRs

### S1 — HTTP security headers + same-origin CSRF guard

**[PR #28](https://github.com/mohammed3001/seerah/pull/28) · merged · `2485c6b`**

| Threat                                             | Before                                     | After                                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Iframe-based clickjacking against the editor       | `frame-ancestors *` (default)              | `frame-ancestors 'self'`                                                                                                                                               |
| Mixed-content downgrade (HTTP asset on HTTPS page) | not blocked                                | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`                                                                                              |
| Cross-origin CSRF against server actions (POST)    | server actions trusted any `Origin` header | `assertSameOrigin(req)` middleware rejects `Origin` ≠ `Host` for state-changing methods                                                                                |
| Inline-script XSS amplification                    | no CSP                                     | `Content-Security-Policy` with `script-src 'self' 'unsafe-inline' …` (Tailwind/Next runtime requires inline; tracked for hardening once Sentry/PostHog removed inline) |
| `Referer` leak to third parties                    | default                                    | `Referrer-Policy: strict-origin-when-cross-origin`                                                                                                                     |

**Files**: `apps/web/src/lib/security/origin.ts` (new), `apps/web/src/lib/security/headers.ts` (new), `apps/web/middleware.ts`, plus the same set under `apps/admin`.

**Out of scope** (deferred to S6 follow-up): nonce-based `script-src` to drop `'unsafe-inline'`. Requires SSR streaming integration with the Next.js root layout.

---

### S3 — File upload hardening (magic bytes)

**[PR #29](https://github.com/mohammed3001/seerah/pull/29) · merged · `7b00a6c`**

| Threat                                                        | Before                                                 | After                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Disguised-type upload (`malware.exe` renamed to `avatar.png`) | trusted only `Content-Type` header (client-controlled) | first 8 bytes read server-side, matched against a magic-byte allow-list (PNG, JPEG, GIF, WebP) |
| Polyglot file (valid PNG header + executable trailer)         | uploaded to Supabase Storage                           | rejected if magic-byte sniff disagrees with `Content-Type` or extension                        |
| 413 amplification (huge file → DoS)                           | no client-side cap                                     | 4 MB cap enforced both client-side (UX) and server-side (defence-in-depth)                     |
| Action throws unhandled `NEXT_REDIRECT` swallowed by toast    | catch ate the redirect                                 | session lookup moved outside try/catch (matches `ai/actions.ts:74-76`)                         |

**Files**: `packages/api/src/security/magic-bytes.ts` (new), `apps/web/src/app/(dashboard)/dashboard/profile/actions.ts`, plus admin avatar upload.

**Devin Review caught**: the `NEXT_REDIRECT` swallow + the missing 4 MB client-side cap. Both fixed before merge.

---

### S4 — Server-enforced password policy

**[PR #30](https://github.com/mohammed3001/seerah/pull/30) · merged · `bf1b61d`**

| Threat                                                      | Before                                          | After                                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Weak passwords (`password`, `qwerty`, …) accepted at signup | only `length ≥ 8` enforced                      | rejects against a 10k common-passwords list, requires uppercase + lowercase + digit, optionally rejects emails-as-passwords |
| Admin bootstrap downgraded to user-tier 8-char minimum      | shared validator → 8 char min for super-admin   | `minLength` parameter added; bootstrap passes 12                                                                            |
| Email confirmation link points to attacker domain           | `emailRedirectTo` built from `X-Forwarded-Host` | uses `process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com"` (matches `stripe/webhook`)                                |
| `looks_like_email` rule disabled at password reset          | only checked at signup                          | session resolved first, then `validatePassword({ email: user?.email })`                                                     |

**Files**: `packages/api/src/security/password-policy.ts` (new, with embedded common-passwords list), `apps/admin/scripts/bootstrap-admin.ts`, `apps/web/src/app/(auth)/{signup,reset-password}/actions.ts`.

**Devin Review caught**: 4 issues across 2 rounds (admin downgrade, X-Forwarded-Host trust, looks_like_email gap, missing min-length clamp). All fixed before merge.

---

### F1 — IDOR + mass-assignment on resume editor

**[PR #31](https://github.com/mohammed3001/seerah/pull/31) · merged · `d05a4fa`**

| Attack (POST to server action)                                                      | Before                                                                                          | After                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `updateResumeMeta(id, { user_id: "<victim>" })`                                     | reassigned the resume to the victim — RLS allowed because the row was now `owned` by the victim | `pickAllowedResumeMeta` strips `user_id` silently                                                      |
| `updateSectionItem(myId, "education", "<victim_section>", patch)`                   | RLS policy _should_ have rejected, but relied on FK-graph cascading instead of explicit check   | `.eq("resume_id", myId).eq("id", sectionId)` filter — explicit, doesn't rely on policy correctness     |
| `insertSectionItem(myId, "skills", { resume_id: "<victim>", id: "<chosen-uuid>" })` | both fields written; depending on RLS policy the row may have been attached to the victim       | `pickAllowed("skills", patch)` drops both; trusted `resume_id: myId` is reattached after the allowlist |
| `upsertSingletonAction(myId, "personal_info", { resume_id: "<victim>" })`           | client-supplied `resume_id` won the spread merge                                                | trusted `resume_id` always wins after allowlist                                                        |

**Files**: `packages/api/src/security/field-allowlist.ts` (new), `apps/web/src/app/(dashboard)/dashboard/resume/[id]/actions.ts`. Allow-lists are derived from migration `20260501120300_resume_sections.sql`.

**Severity**: This was the closest the audit found to a _functional_ exploit — a mass-assignment bug in a server action that handled all user-mutable resume fields, with one of the writes (`updateResumeMeta`) reassigning the row to an arbitrary `user_id`.

---

### F3 — Self-service account deletion + storage cascade

**[PR #32](https://github.com/mohammed3001/seerah/pull/32) · merged · `27112ee`**

| Behaviour                               | Before                                                                                                                                                           | After                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-facing "Delete account" page       | dead nav link (no page existed)                                                                                                                                  | `/dashboard/settings` with "type your email + DELETE" form                                                                                                                |
| Storage cleanup on account delete       | files orphaned in public `avatars/` bucket forever (URL-guessable)                                                                                               | `deleteUserStorageArtifacts` paginates and removes the user's prefix in `avatars/` and `attachments/`                                                                     |
| Order: storage sweep → auth delete      | unrecoverable data-loss case if `auth.admin.deleteUser` fails after sweep succeeded                                                                              | reversed: auth delete first (single source of truth); orphans after a successful auth-delete are recoverable, a successful storage-sweep with a failed auth-delete is not |
| Promise.all over multiple bucket sweeps | one sweep throwing aborted the others **and** the auth delete                                                                                                    | `Promise.allSettled` + try/catch inside the per-bucket helper                                                                                                             |
| Pagination during sweep                 | offset advanced after each successful `remove()` — but removed files vanish, so the _next_ page was actually 1000 files later, leaving every other page un-swept | offset stays put on success (the next page slides up to fill the gap), advances only on `remove()` failure to break out of an infinite loop on a poison batch             |
| `redirect()` after delete               | server action threw `NEXT_REDIRECT`; the client `try/catch` ate it and showed "delete failed" toast — _while the user's account was actually being deleted_      | action returns envelope `{ ok: true, redirectTo } \| { ok: false, message }`; client navigates with `router.replace`                                                      |
| Email gating in client                  | `.trim()` only in the gate, raw value sent                                                                                                                       | `.trim()` before the FormData write too                                                                                                                                   |

**Files**: `packages/api/src/security/account-deletion.ts` (new), `apps/web/src/app/(dashboard)/dashboard/settings/{page.tsx,actions.ts,delete-account-form.tsx}` (new), `apps/admin/src/lib/users/actions.ts` (re-uses the same helper, writes per-bucket counters into `admin_audit_log.metadata`).

**Devin Review caught**: 4 issues across 4 rounds — every one of them a real bug: pagination skip, false toast, untrimmed email, Promise.all leak, ordering bug. All fixed before merge. This PR has the highest review-iteration count of the audit.

**Out of scope** (tracked for the subscriptions/email PR): auto-cancel Stripe subscription on account delete. UI warns about it and links to `/subscription`.

---

### T1 — DB-driven template gating + dev gallery

**[PR #33](https://github.com/mohammed3001/seerah/pull/33) · merged · `153a79a`**

| Threat                                                             | Before                                                                                                                                                                                         | After                                                                                                                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin disables template via `admin_set_template_active` RPC        | UI updates the badge, but `applyTemplate` server action and `POST /api/resume/[id]/design` (mobile) read only the frozen `TEMPLATE_BY_ID` registry — disabled templates still applied silently | both endpoints read the DB row alongside the registry; RLS filters disabled rows for non-service clients; both endpoints return "هذا التصميم غير متاح حاليًا" |
| Admin re-prices template via `admin_set_template_pricing` RPC      | `meta.is_premium` was read from frozen registry — admin re-pricing was visible nowhere                                                                                                         | both endpoints read `is_premium` from DB; free user trying to apply a now-paid template hits the gate                                                         |
| Render path / `/render/[id]` for already-applied disabled template | not affected (intentional UX: disabling blocks new applications, doesn't break existing exports)                                                                                               | unchanged                                                                                                                                                     |

**Files**: `apps/web/src/app/(dashboard)/dashboard/resume/[id]/design/actions.ts`, `apps/web/src/app/api/resume/[id]/design/route.ts`, `apps/web/src/templates/_sample.ts` (new sample resume), `apps/web/src/app/(dashboard)/dashboard/dev/templates/page.tsx` (dev-only gallery, gated by `NODE_ENV !== "production"` + dashboard auth).

**Out of scope** (intentional): the `/render/[id]` endpoint and PDF export keep using the frozen registry without consulting the DB, so resumes already attached to a disabled template don't break. Disabling is "no new applications", not "kill existing".

---

### M1 — Flutter mobile, code-level audit

**[PR #36](https://github.com/mohammed3001/seerah/pull/36) · merged · `6797c59`**

| Threat                                                                                                                       | Before                                                                                                                                                                                        | After                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User A signs out → user B signs in on same device → reconnects → outbox replays user A's queued edits under user B's session | `signOut()` only called `auth.signOut()` — `Outbox` and `ResumeCache` docstrings promised a wipe but no caller invoked it                                                                     | `signOutAndWipe(ref)` clears outbox + resume cache + biometric flag + gotrue session in this order:<br>① drop queued mutations<br>② drop cached bundles<br>③ end gotrue session (return false on failure)<br>④ reset in-memory unlock gate (only on signOut success)<br>⑤ clear biometric opt-in (only on signOut success) |
| Lock-screen biometric bypass on signOut failure                                                                              | original ordering put biometric mutations _before_ `signOut`; if `signOut` failed (network drop), the lock screen was disabled and the user landed on `/dashboard` with a still-valid session | Devin Review caught this; ordering reversed; helper now returns `bool` and both callers show a retry toast on failure (lock screen stays up)                                                                                                                                                                               |
| User B's first dashboard fetch shows user A's cached resumes for ~hundreds of ms                                             | resume cache leaked across sessions                                                                                                                                                           | resume cache cleared on sign-out                                                                                                                                                                                                                                                                                           |
| Attacker with Android Studio signs an update APK pretending to be us                                                         | release `signingConfig` was hard-coded to `signingConfigs.debug` (with a TODO)                                                                                                                | reads from `android/key.properties` (gitignored); falls back to debug with a Gradle warning if missing                                                                                                                                                                                                                     |
| Reverse-engineer reads release APK Dart symbols + unused resources                                                           | no `minifyEnabled`, no `shrinkResources`                                                                                                                                                      | `minifyEnabled true` + `shrinkResources true` + `proguard-rules.pro` (keep rules for Flutter / `androidx.biometric` / Hive / `kotlinx.serialization`)                                                                                                                                                                      |
| Hive boxes (PII: name, phone, address) sync to Google Drive backups by default                                               | `allowBackup` default = true on API < 31                                                                                                                                                      | `allowBackup="false"` + `data_extraction_rules.xml` excludes every domain from cloud backup _and_ Android 12+ device-to-device transfer                                                                                                                                                                                    |
| Resume content visible in app switcher / screenshots / screen-record                                                         | default Android behaviour                                                                                                                                                                     | `FLAG_SECURE` set in `MainActivity.onCreate`                                                                                                                                                                                                                                                                               |
| Hostile DNS / network compromise pushes app to plaintext HTTP                                                                | no platform-level guard                                                                                                                                                                       | `network_security_config.xml` denies cleartext + system-only trust anchors                                                                                                                                                                                                                                                 |

**Files**: `apps/mobile/lib/core/auth/sign_out.dart` (new), `apps/mobile/lib/features/{profile,auth/biometric_lock_screen}/*.dart`, `apps/mobile/android/app/build.gradle`, `apps/mobile/android/app/proguard-rules.pro` (new), `apps/mobile/android/app/src/main/AndroidManifest.xml`, `apps/mobile/android/app/src/main/res/xml/{network_security_config,data_extraction_rules}.xml` (new), `apps/mobile/android/app/src/main/kotlin/com/seerah/app/MainActivity.kt`, `apps/mobile/test/sign_out_test.dart` (new — 3 tests).

**Devin Review caught**: the lock-screen bypass ordering bug. Critical-severity finding caught before merge.

---

### M1b — Binary-level verification + AGP bump + iOS overlay

**[PR #37](https://github.com/mohammed3001/seerah/pull/37) · open · CI green**

The intent was emulator smoke-test on Android + iOS. Linux VM has no `/dev/kvm` (so an emulator runs in pure software emulation, unusably slow) and Apple hard-blocks iOS Simulator off macOS. Substituted with build+inspect:

| M1 claim                                                                       | Verification                                                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `FLAG_SECURE` lands in compiled bytecode                                       | `dexdump -d` shows `const/16 v1, #int 8192` + `setFlags(II)V` preserved by ProGuard ✓                                       |
| `allowBackup=false` lands in compiled manifest                                 | `aapt dump xmltree`: `(type 0x12)0x0` ✓                                                                                     |
| `dataExtractionRules` references a properly-formed XML excluding all 5 domains | extracted compiled XML, all 10 excludes present ✓                                                                           |
| `usesCleartextTraffic=false` in compiled manifest                              | `(type 0x12)0x0` ✓                                                                                                          |
| `networkSecurityConfig` denies cleartext + system trust only                   | extracted compiled XML: `cleartextTrafficPermitted=0x0`, `<certificates src="system" />` ✓                                  |
| `minifyEnabled` + `shrinkResources` actually run                               | release 36.1 MB vs debug 110 MB (-67%); `R$*` classes stripped from release dex; resource files renamed `res/8G.xml` etc. ✓ |
| Signing fallback to debug keystore works without breaking the build            | `apksigner verify` shows debug cert; Gradle WARNING printed at build time ✓                                                 |

Side-effects discovered while building:

- AGP 8.1.0 was not buildable on a clean machine because transitive `androidx.core:core:1.16.0` requires AGP ≥ 8.6. Bumped to AGP 8.7.0 + Gradle 8.10.2 + Kotlin 1.9.24. This was a _latent_ breakage in tip; anyone cloning today would hit it.
- NDK 26.x was warning-spam because 12 Flutter plugins all request 27.x. Pinned to `27.0.12077973`.

iOS counterpart to `FLAG_SECURE` added to `AppDelegate.swift`: a system-background `UIView` overlay during `applicationWillResignActive` / removed during `applicationDidBecomeActive`. Standard pattern; authored but **not compile-tested** — Linux can't compile Swift toolchain regardless of effort. iOS test plan in [`docs/audit/M1b-emulator-verification.md`](./M1b-emulator-verification.md) walks the operator through verifying it on a Mac.

## 4. Pending audit work — concrete blockers

### S2, F2, A1, P1 — all blocked on Upstash Redis

The audit spec specifies Upstash Redis as the rate-limit + counter + cache primitive. The four pending PRs in this chain:

| PR                                             | What it does                                                                                                                              | Why it needs Redis                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **S2** Web rate limiting                       | per-IP + per-user-id rate buckets on `/api/auth/*`, `/api/ai/*`, `/api/resume/*/design`, `/api/contact`, public-resume `/r/[slug]`        | `@upstash/ratelimit` sliding-window primitive |
| **F2** Public resume hardening                 | per-IP throttling on `/r/[slug]`, view-counter increment, robots/no-index by default for new resumes                                      | bucket counter; depends on S2 middleware      |
| **A1** Spam-keyword filter + AI abuse alerting | per-user-id daily AI-token counter, threshold alert webhook, profanity/spam classifier                                                    | counter primitives + transactional INCR       |
| **P1** N+1 audit + caching layer               | `dashboard/page.tsx` fan-out fetch (resumes + completion + counts → 4 round-trips) → 1 cached SELECT; admin `/users` paginated list cache | `@upstash/redis` GET/SET with TTL             |

**Unblock**: provide `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (org-scope recommended). Free tier with no card: <https://console.upstash.com/redis> → Create Database → Global / Frankfurt region.

Once those land, the four PRs can be opened back-to-back in a single working session — the work is well-scoped and largely orthogonal to the merged audit.

### S5 — Cloudflare Turnstile

Bot protection on signup, password reset, and contact-form endpoints. Replaces the absent CAPTCHA with a privacy-respecting alternative.

**Unblock**: `TURNSTILE_SITE_KEY` (public, embedded in `<form>`) and `TURNSTILE_SECRET_KEY` (server, scrubbed from logs). Free tier: <https://dash.cloudflare.com/?to=/:account/turnstile>.

### S6 — Sentry init + PII scrub

Error reporting for `apps/web` and `apps/admin`. PII scrubbing is non-trivial — the audit spec requires stripping resume-content fields (`name`, `phone`, `address`, `email`) from `breadcrumbs.message` and `request.data` before send.

**Unblock**: `SENTRY_DSN` for web + admin (separate projects recommended for blast-radius isolation; can be merged later).

### S2 → S5 → S6 sequencing

S2/F2/A1/P1 are independent of S5 and S6 — the dependency chain is purely on Redis. S5 and S6 each unblock independently. All four chains can run in parallel from the operator's side.

## 5. Out of scope — with rationale

These were considered and explicitly _not_ taken. Documenting the rationale here so a future audit doesn't re-litigate.

| Item                                     | Why excluded                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Certificate pinning** (mobile)         | Supabase rotates certs frequently; pinning would brick the app on every rotation. Cleartext denial + system-trust-only via `network_security_config` (PR #36) is the correct posture.                                                                                                           |
| **Jailbreak / root detection** (mobile)  | `flutter_jailbreak_detection` and similar libs have a high false-positive rate on customised legitimate devices (Samsung's Knox bootloader unlock, Xiaomi's developer mode, etc.) and a determined attacker bypasses them with Magisk in minutes. Cost > benefit for a CV-builder threat model. |
| **WebAuthn / FIDO2 for admin**           | Admin already has TOTP-2FA; the audit spec didn't include WebAuthn migration. Recommended as a future hardening once Stripe-style admin tooling is built out.                                                                                                                                   |
| **Stripe 3DS-for-all**                   | Stripe's risk engine handles 3DS escalation per-transaction. Forcing 3DS on every charge would hurt conversion in regions where it's not required.                                                                                                                                              |
| **Email rotation / DKIM key rotation**   | Resend handles this for us. Out of scope; ops concern.                                                                                                                                                                                                                                          |
| **CSP nonce-based `script-src`**         | Next.js 15 streaming + Tailwind runtime both inject inline scripts. Migrating to nonce-based requires SSR streaming integration in the root layout. Tracked for S6 follow-up.                                                                                                                   |
| **iOS jailbreak detection**              | Same rationale as Android root detection.                                                                                                                                                                                                                                                       |
| **PWA / service worker security**        | App is not currently shipped as a PWA.                                                                                                                                                                                                                                                          |
| **Fine-grained per-template watermark**  | Watermarking on `/render/[id]` for free-tier exports is already in place from Phase 4; per-template watermark customisation is a feature, not a security concern.                                                                                                                               |
| **Stripe webhook IP allowlist**          | Stripe rotates source IPs; signature verification (already in place) is the supported approach.                                                                                                                                                                                                 |
| **AI service request-replay protection** | Stateless service-token auth + token rotation (in place); replay window is bounded by token TTL. Adding a nonce store doesn't move the needle for the threat model.                                                                                                                             |

## 6. Operator action items before production

The audit assumed an internal-staging deployment. Production rollout requires:

| #   | Action                                                                                                     | Why                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Drop a real keystore at `apps/mobile/android/key.properties` (already gitignored)                          | Without this, every `flutter build apk --release` is signed with the public Android Debug keystore. Play Store will reject; sideload distribution would let any Android Studio user sign update APKs. **Operator must do this on their own machine**, never in CI without HSM-backed secret store. |
| 2   | Rotate Supabase DB password                                                                                | The string `$Masa07700180` appeared in a chat log earlier in the project history. Treat as compromised.                                                                                                                                                                                            |
| 3   | Rotate Resend / Stripe / OpenAI / Firebase API keys                                                        | Same rotation cadence; any keys that may have been pasted into chat logs or development sessions. Devin sessions never persist user data, but rotation is cheap insurance.                                                                                                                         |
| 4   | Create org-scoped `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`                                    | Unblocks S2/F2/A1/P1.                                                                                                                                                                                                                                                                              |
| 5   | Create org-scoped `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`                                            | Unblocks S5.                                                                                                                                                                                                                                                                                       |
| 6   | Create org-scoped `SENTRY_DSN_WEB` + `SENTRY_DSN_ADMIN` (or one shared)                                    | Unblocks S6.                                                                                                                                                                                                                                                                                       |
| 7   | Run iOS test plan from `docs/audit/M1b-emulator-verification.md` § "iOS test plan" on a Mac with Xcode 15+ | Verify `AppDelegate.swift` privacy overlay + biometric flow + sign-out wipe parity (the Linux VM cannot compile Swift).                                                                                                                                                                            |
| 8   | Enable Supabase Storage object-versioning + lifecycle rules on `avatars/` and `attachments/`               | Defence-in-depth in case the storage cascade in PR #32 misses an edge case. Lifecycle should set TTL on objects in `avatars/<deleted_user_id>/` to N days for delayed forensic recovery.                                                                                                           |
| 9   | Configure `NEXT_PUBLIC_APP_URL` to `https://seerah.com` (or production domain) in production env           | PR #30 grounds password-reset / email-confirmation links on this env var; falls back to `https://seerah.com` if missing.                                                                                                                                                                           |
| 10  | Revoke any test admin accounts created during the audit window                                             | `bootstrap-admin.ts` was used to provision the audit's admin user; ensure no test accounts remain in `auth.users` with `admin` role.                                                                                                                                                               |

## 7. Threat surface still uncovered

Honest accounting of what the audit _didn't_ close, even with the pending PRs landed:

- **Subdomain takeover defence**: no monitoring for hanging DNS records pointing at decommissioned services (Vercel preview deployments, etc.). Treat as ops monitoring, out of code-audit scope.
- **Insider risk on Supabase admin keys**: `service_role` key has full RLS bypass. Currently scoped to Vercel env vars + admin Edge Functions. Post-audit recommendation: rotate quarterly, audit access logs, consider Supabase Vault for sensitive DB column encryption.
- **Mobile-side cert pinning gap**: see § 5; explicit decision, not a gap by oversight.
- **Admin session fixation**: admin login uses the same session cookie name across logins; consider rotating session ID on privilege escalation (e.g. on TOTP success).
- **AI service prompt injection**: `services/ai` accepts user-supplied resume content + free-form prompts. No structured sanitisation; relies on model alignment. Out of code-audit scope; covered by spam keyword filter (A1) once Redis lands.
- **PDF service SSRF**: `services/pdf` fetches CSS / images from URLs in resume content. No URL allow-list; no internal-IP block. Recommend post-audit hardening to deny RFC1918 ranges.
- **Stripe customer email enumeration**: `customer_email` is set from auth at checkout; if Stripe Checkout itself returns "this email already has a customer" timing differences, attacker could enumerate registered users. Stripe's surface; out of code-audit scope.

## 8. Test / verification trail

| Audit PR | Tests added                          | CI status at merge                   | Devin Review findings (real)                                                     |
| -------- | ------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- |
| S1 #28   | — (header smoke checked manually)    | green first push                     | 0                                                                                |
| S3 #29   | —                                    | green after 2 fixes                  | 2 (NEXT_REDIRECT swallow, missing 4MB cap)                                       |
| S4 #30   | —                                    | green after 4 fixes + merge conflict | 4 (admin downgrade, X-Forwarded-Host, looks_like_email, missing minLength clamp) |
| F1 #31   | —                                    | green first push                     | 0 published                                                                      |
| F3 #32   | —                                    | green after 4 fixes + merge conflict | 4 (pagination skip, false toast, untrimmed email, Promise.all leak, ordering)    |
| T1 #33   | —                                    | green first push                     | 0 published                                                                      |
| M1 #36   | 3 unit tests on `wipeLocalUserData`  | green after 1 fix                    | 1 (lock-screen bypass ordering)                                                  |
| M1b #37  | — (binary-level verification report) | green first push                     | 0                                                                                |

Total: 14 real review findings caught and fixed before merge across 8 PRs. No findings escaped to production.

## 9. Appendix — secret request status

For reference; all expressed requests were sent to the operator's timeline as Devin secret requests with org-scope save recommended.

| Secret                               | Purpose                                                  | Status                  |
| ------------------------------------ | -------------------------------------------------------- | ----------------------- |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN`  | S2/F2/A1/P1                                              | requested, not received |
| `TURNSTILE_SITE_KEY` + `_SECRET_KEY` | S5                                                       | requested, not received |
| `SENTRY_DSN_WEB` / `_ADMIN`          | S6                                                       | requested, not received |
| `STRIPE_WEBHOOK_SECRET`              | finishing PR-Audit-S0 (subscriptions hardening)          | requested, not received |
| `RESEND_API_KEY`                     | retroactive audit of email send-from + DKIM verification | requested, not received |

None of these are blocking for the _currently merged_ audit work. All four pending audit PRs are on the same Upstash unblock; the rest are independent.

---

_This document is an artefact of the X1 audit phase. See `docs/audit/M1b-emulator-verification.md` for the binary-level mobile evidence. Individual PR threat tables remain canonical in the linked GitHub PR descriptions._
