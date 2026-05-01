# Seerah — سيرة

AI-powered resume builder SaaS. Turborepo monorepo containing Next.js apps,
shared TypeScript packages, FastAPI services, and a Flutter mobile client.

> **Status:** Infrastructure tier — database schema, monorepo skeleton, and
> CI only. UI lands in a follow-up PR.

## Workspaces

| Path                   | Stack                       | Purpose                                     |
| ---------------------- | --------------------------- | ------------------------------------------- |
| `apps/web`             | Next.js 15 (App Router), TS | Public web app                              |
| `apps/admin`           | Next.js 15, TS              | Admin panel                                 |
| `apps/mobile`          | Flutter 3.x + Riverpod      | Mobile client (own toolchain, outside pnpm) |
| `packages/api`         | TypeScript                  | Shared Supabase client + service contracts  |
| `packages/types`       | TypeScript                  | Shared DB + domain types                    |
| `packages/ui`          | TypeScript + Tailwind       | Shared component library (shadcn-style)     |
| `services/ai`          | FastAPI 3.12                | Anthropic Claude integration                |
| `services/pdf`         | FastAPI 3.12                | Puppeteer + WeasyPrint PDF/PNG renderer     |
| `supabase/migrations/` | SQL                         | Source of truth for the Postgres schema     |

## Tech stack

- **Frontend:** Next.js 15, TypeScript 5, Tailwind 3, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **AI:** FastAPI + Anthropic Claude (`claude-3-5-sonnet-20241022`)
- **PDF:** FastAPI + Puppeteer (`pyppeteer`) + WeasyPrint fallback
- **Payments:** Stripe (global) + Paddle (MENA)
- **Cache / rate-limit:** Upstash Redis
- **Background jobs:** Inngest
- **Monitoring:** Sentry + PostHog
- **Deploy:** Vercel (web + admin) + Railway (AI + PDF services)

## Prerequisites

- Node `>= 20.10` (see `.nvmrc`)
- pnpm `>= 9.0`
- Python `3.12`
- Docker (for local Supabase + service containers, optional)
- Flutter `>= 3.24` (only needed if you touch `apps/mobile`)
- Supabase CLI (`brew install supabase/tap/supabase` or `pnpm dlx supabase`)

## Setup

```bash
# 1. Install JS deps
corepack enable
pnpm install

# 2. Copy env template (fill in real values)
cp .env.example .env.local

# 3. Start local Supabase (optional but recommended)
pnpm dlx supabase start

# 4. Apply migrations to your Supabase project
pnpm dlx supabase db push   # cloud project
# or
pnpm dlx supabase db reset  # local stack — re-runs all migrations + seed.sql

# 5. (Re)generate DB types into packages/types/src/database.ts
pnpm dlx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" --schema public \
  > packages/types/src/database.ts

# 6. Python services
cd services/ai && pip install -e ".[dev]" && cd -
cd services/pdf && pip install -e ".[dev]" && cd -
```

## Common scripts

```bash
pnpm dev          # turbo dev across web + admin (parallel)
pnpm build        # production build of every JS workspace
pnpm lint         # ESLint via Next + tsc on packages
pnpm typecheck    # tsc --noEmit everywhere
pnpm format       # prettier --write
```

## Database schema

Schema lives in `supabase/migrations/` and is applied in alphanumeric order.
Every public table has Row Level Security enabled — see
`20260501120700_rls_policies.sql`.

Key functions:

- `public.calculate_completion_score(resume_id uuid) -> int` — 0..100
- `public.generate_unique_slug(name text) -> text`
- `public.update_updated_at()` — trigger function
- `public.handle_new_user()` — auth.users → profiles bootstrap

Storage buckets:

- `avatars` (public, owner-write)
- `attachments` (private, owner-only)

## Deployment targets

- **Vercel** — `apps/web` and `apps/admin` (separate projects pointing at the
  same monorepo with `pnpm` build command).
- **Railway** — `services/ai` and `services/pdf` via the included
  `Dockerfile`s.
- **Supabase** — managed Postgres + Auth + Storage; run migrations through
  the CLI.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR:

1. JS — `format:check` → `typecheck` → `lint` → `build` (Turborepo cached)
2. AI service — `ruff check` + `pytest`
3. PDF service — `ruff check` + `pytest`
4. Supabase — applies every migration to a fresh Postgres 15 container
5. Flutter — `analyze` + `test`, gated to `apps/mobile/` changes

## License

Proprietary — © Seerah. All rights reserved.
