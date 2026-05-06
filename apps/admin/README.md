# @seerah/admin

The Seerah administration panel. Runs as a separate Next.js app on
port `3001` locally and is intended to be deployed to its own subdomain
(e.g. `admin.seerah.com`) so cookies stay isolated from the user-facing
site.

This app uses the Supabase **service-role** key to read and write every
table — **never deploy it on a public path of the user-facing app**.

## First-run bootstrap

There is no admin signup form by design. The first super-admin is
created by a one-shot script that talks to the database directly.

```bash
# from the repo root, with the four env vars set:
ADMIN_BOOTSTRAP_EMAIL=you@seerah.com \
ADMIN_BOOTSTRAP_PASSWORD='a-strong-12+char-password-with-1-digit' \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
pnpm --filter @seerah/admin bootstrap
```

The script:

1. Validates the password (≥12 chars, ≥1 letter, ≥1 digit).
2. Hashes it with bcrypt at cost 12.
3. Generates a fresh 160-bit TOTP secret.
4. Calls `public.bootstrap_first_admin(...)`, which returns `NULL` if any
   admin already exists — meaning you can never accidentally create a
   second super-admin through this path.
5. Prints the QR + base32 secret to the terminal **once**. Scan it with
   Authy / Google Authenticator / 1Password and store the secret in your
   password manager as a backup.

After bootstrap, additional admins (super_admin, support_agent,
template_manager) are added through the Settings → Admin team panel.

## Login flow (PR-A2)

1. **Email + password** — submitted on `/login`. Failed attempts increment
   `admin_users.failed_login_attempts`; after 5 in a row the account is
   locked for 30 minutes.
2. **TOTP** — on success, the operator is redirected to `/2fa/verify`
   (or `/2fa/setup` for accounts created via the panel without a secret
   yet).
3. **Session** — once the TOTP code passes, an `admin_sessions` row is
   created and the browser receives an httpOnly cookie. Only the SHA-256
   of the cookie token is persisted, so a database leak does not surrender
   live sessions. Sessions expire after 2 hours of inactivity.
4. **IP allowlist** — every request (including `/login`) is filtered by
   `admin_ip_allowlist`. While the table is empty _or_ has no `is_active`
   rows, all source IPs are allowed (fail-safe so the first operator
   doesn't lock themselves out). Add at least one CIDR via Settings to
   enforce the gate.
5. **Audit log** — every login attempt, TOTP enrollment, and logout is
   written to `admin_audit_log` with the source IP and user-agent.

## Recovery

- **Lost TOTP device:** another `super_admin` can clear `totp_secret` and
  `totp_verified_at` on the affected row from the Settings → Admin team
  panel; the operator will be prompted to re-enroll on next login.
- **All super_admins locked out:** rotate `SUPABASE_SERVICE_ROLE_KEY`,
  then run `pnpm bootstrap` after manually deleting the bricked rows from
  `admin_users` via psql. The bootstrap script refuses to insert if
  _any_ admin row exists, so you must clear the table first.

## Required environment

Copy `apps/admin/.env.local.example` to `apps/admin/.env.local` and fill:

| Variable                    | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Project URL — same as the user-facing app           |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — admin needs full DB access       |
| `ADMIN_SESSION_SECRET`      | 32-byte hex; signs the admin session cookie (PR-A2) |
| `ADMIN_BOOTSTRAP_EMAIL`     | Bootstrap script only; remove after first run       |
| `ADMIN_BOOTSTRAP_PASSWORD`  | Bootstrap script only; remove after first run       |

## Scripts

```bash
pnpm dev          # next dev --port 3001
pnpm build        # next build
pnpm start        # next start --port 3001
pnpm lint         # next lint --max-warnings=0
pnpm typecheck    # tsc --noEmit
pnpm bootstrap    # run scripts/bootstrap-admin.ts (first super-admin)
```
