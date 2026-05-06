# Contributing to Seerah

Thank you for considering contributing to Seerah. This document collects
the project conventions you need to know to land a change cleanly.

## Before you start

- For **bugs**, file a GitHub issue first if one does not already exist.
- For **security issues**, see [`SECURITY.md`](SECURITY.md) — do not open
  a public PR or issue.
- For **non-trivial features**, open a discussion or RFC issue first so
  we can agree on the shape of the change before code is written.

## Local setup

The full setup matrix is in [`README.md`](README.md#setup). TL;DR:

```bash
corepack enable
pnpm install
cp .env.example .env.local       # then fill in the secrets
pnpm dev                         # runs apps/web + apps/admin in parallel
```

For the mobile app, the toolchain is independent of pnpm:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

## Branch & PR conventions

- **Branch from** `devin/1777667032-infrastructure-tier` (the long-lived
  integration branch the audit / refactor work targets). Once that
  branch eventually merges back into `main`, all subsequent work should
  branch from `main`.
- **Branch name format:** `devin/<unix-timestamp>-<short-description>`,
  e.g. `devin/1778057867-ci-infrastructure-tier-trigger`. This is the
  convention used throughout the audit cycle and keeps branches sortable
  by creation time.
- **Don't squash before pushing** — keep your iterative commits. Reviewers
  can use `git diff main..HEAD` to see the cumulative diff and the
  individual commits to follow your reasoning.
- **PR template** lives at `.github/PULL_REQUEST_TEMPLATE.md`. Fill in
  every section. Empty sections should be explicitly marked "N/A" rather
  than deleted, so reviewers know you considered them.
- **Scope checkboxes** at the top of the PR template are required. They
  drive a reviewer's focus and they show in CODEOWNERS routing.

## Commit messages

Follow Conventional Commits:

```
<type>(<scope>): <one-line summary>

<longer explanation if needed>
```

Common types: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`,
`perf`.

Common scopes:

- `web`, `admin`, `mobile` — the three app workspaces
- `api`, `types`, `ui` — shared packages
- `ai`, `pdf` — Python services
- `db`, `rls` — Supabase migrations / row-level security
- `audit`, `security` — the audit cycle's deliverables
- `ci`, `infra` — workflows, dockerfiles, deploy configs

Example:

```
fix(security): address mass-assignment on resume editor

Server actions accepted Record<string, unknown> and passed the value
straight to Supabase.  Now every write goes through a per-table
allowlist defined in packages/api/src/security/field-allowlist.ts.
```

## Code style

- **TypeScript:** ESLint + Prettier. Run `pnpm format` before pushing.
  CI will reject style drift on `infrastructure-tier` and `main`.
- **Python:** Ruff. Run `ruff format && ruff check --fix` in the
  service directory before pushing.
- **Dart:** `dart format` (settings live in `apps/mobile/analysis_options.yaml`).
- **SQL:** Plain Postgres dialect, two-space indent, lowercase
  keywords, `if not exists` / `if exists` everywhere migrations are
  re-runnable.

Style nits that consistently come up in review:

- Use named exports, not default exports, for shared library code.
- Don't use `any`. If TypeScript can't infer the right type, write a
  proper interface — or, in rare cases, document the unsafe boundary
  with a `// eslint-disable-next-line` and a one-sentence comment.
- React components live in PascalCase files; hooks live in
  `use-kebab-case.ts`; server actions live in `actions.ts` next to the
  page that calls them.
- Don't import from `@seerah/ui/index` — import from the leaf module
  (`@seerah/ui/components/button`).

## Testing

- **JS:** No unit-test runner is wired up at the repo level. Component
  tests, when added, will use Vitest under each workspace.
- **Mobile:** `flutter test` is required to pass on every mobile PR.
  The audit cycle added 3 sign-out tests in
  `apps/mobile/test/sign_out_test.dart` — model new test files after
  those.
- **Python services:** `pytest` is required to pass on every services
  PR. Tests live in `services/ai/tests/` and `services/pdf/tests/`.
- **Supabase migrations:** CI applies the full migration sequence to a
  fresh Postgres 15 container on every PR. If your migration breaks
  this, your PR is red. Use `if not exists` / `if exists` so migrations
  are idempotent.

Manual testing checklist for `apps/web` UI changes:

- [ ] Run on both `lang=ar` and `lang=en` (RTL still renders correctly)
- [ ] Run on both `mode=light` and `mode=dark`
- [ ] Test on a 360px-wide viewport for mobile responsive behaviour

## Database changes

- Every schema change is a forward-only migration in
  `supabase/migrations/<timestamp>_<slug>.sql`.
- Never edit a migration after it has been merged. Add a new migration
  to roll forward.
- Every new public table needs an RLS policy. See
  `supabase/migrations/20260501120700_rls_policies.sql` for the
  established pattern.
- If you grant new privileges to `anon` / `authenticated`, document the
  threat model in your PR. Default is no public read.
- Re-generate types after schema changes:

  ```bash
  pnpm dlx supabase gen types typescript \
    --project-id "$SUPABASE_PROJECT_REF" --schema public \
    > packages/types/src/database.ts
  ```

## Reviewing other PRs

- Check the **Scope** checkboxes match the diff. A PR that ticked
  "Frontend" but added a migration deserves a question.
- Read every modified RLS policy by hand. RLS is invisible to
  type-checking and lint; reviewers are the only safety net.
- For `apps/mobile` PRs, watch for changes to:
  - `signOut` flows — they must wipe Hive caches before severing the
    Supabase session (see PR #36).
  - `key.properties` / signing config — never accept a debug-keystore
    fallback for a release build that is going to the Play Store.
- For Stripe / Paddle webhook PRs, verify signature validation lives
  before any side effect.

## Conduct

We follow the Contributor Covenant. Be respectful and assume good
intent; if you experience or witness unacceptable behaviour, contact
**conduct@seerah.com** privately.
