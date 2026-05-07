# Testing visual design tokens (Seerah web)

Use this skill when verifying token-only changes (CSS variables, Tailwind config, packages/ui CVA) on `apps/web` — e.g. PR #50 (CV Lite migration). Goal: catch regressions in the **chrome** without breaking **premium template artifacts** (which intentionally hold inline hex colors).

## Context — what makes this app non-obvious

- **RTL Arabic-first**: `<html lang="ar" dir="rtl">`. Cairo (Arabic body) + Manrope (Latin headings) load via `apps/web/src/lib/fonts.ts` + layout. When testing copy direction, use `dir` instead of `text-align`.
- **Auth redirect**: middleware redirects authenticated users from `/auth/login` → `/dashboard`. To test the **auth-page** Card+Input+Button surface, either (a) clear cookies for `localhost`, (b) use an incognito window, or (c) substitute another surface that uses the same `packages/ui` primitives (e.g. settings page input, modals).
- **Dev gallery 404 in prod build**: `apps/web/src/app/(dashboard)/dashboard/dev/templates/page.tsx` calls `notFound()` if `NODE_ENV === "production"`. To verify premium templates in a `pnpm start` build, navigate to `/dashboard/resume/{id}/design` instead — same `RenderTemplate` registry, always reachable.
- **Premium templates own their colors**: by design, the 11 templates in `packages/templates/...` (especially the 4+ premium ones from PR #47) hold inline hex (`#0F172A`, gold rule, purple gradient, monospace, ✦/◆/▲ ornaments). Token migrations MUST NOT pull these into the global palette.
- **Color picker shows `#635BFF`**: this is a user-selectable accent for the _resume preview_, not the chrome `--accent`. Don't flag it as a regression.

## Bootstrap

1. **Build + serve prod**: from repo root, `pnpm --filter @seerah/web build && pnpm --filter @seerah/web start` → http://localhost:3000.
2. **Test account**: prefer creating a fresh user via Supabase service-role using `apps/web/.env.local` keys (see Devin Secrets Needed). Do **not** use admin/staff accounts for chrome testing — premium gating won't fire.
3. **Get a resume id**: `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/resumes?select=id,user_id&order=updated_at.desc&limit=3" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"` (note: column is `user_id`, not `owner_id`).

## What to verify (adversarial)

For every token migration, ask: "would the test still pass if the migration silently broke?" Use these surfaces:

| Surface                             | What to check                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Dashboard CTA button                | bg / height / radius / box-shadow against spec                                     |
| `/dashboard/settings` input (focus) | borderColor + box-shadow glow + radius                                             |
| Theme toggle in topbar              | dark-mode `--accent` resolves to new family, not legacy                            |
| `/dashboard/resume/{id}/design`     | all 11 template cards render; premium badge tint; clicking premium → upgrade modal |
| Upgrade modal                       | CTA still uses new token; modal shape obeys new `--radius`                         |

## DevTools verification snippet

Paste in console to dump computed styles + CSS custom properties:

```js
const btn = document.querySelector('main button[type="button"]') || document.activeElement;
const cs = getComputedStyle(btn);
console.log(
  JSON.stringify(
    {
      bg: cs.backgroundColor,
      color: cs.color,
      height: cs.height,
      radius: cs.borderRadius,
      boxShadow: cs.boxShadow.slice(0, 80),
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      fontDisplay: getComputedStyle(document.documentElement)
        .getPropertyValue("--font-display")
        .trim(),
    },
    null,
    2,
  ),
);
```

For a focused input:

```js
const el = document.activeElement;
const cs = getComputedStyle(el);
console.log({ borderColor: cs.borderColor, boxShadow: cs.boxShadow, radius: cs.borderRadius });
```

## Recording

Maximize the browser before recording. Use `annotate_recording` with **test_start** + **assertion** (passed/failed) pairs in 'It should ...' style. Group related checks into one assertion (e.g. "CTA = blue, 48px, 8px radius" — not three separate assertions).

## Known gotchas (might be broken in the future, here are workarounds)

- If `/auth/login` keeps redirecting after cookie clear, the cookie domain might persist — try a hard-reload + `application > clear storage` in DevTools.
- If the dev gallery is wanted in production, gate it behind a `?dev=1&secret=...` flag instead of `NODE_ENV` (out of scope; today: use the design picker).
- If `pnpm start` complains about port 3000 in use, kill via `pkill -f "next-server"` rather than `pnpm dev` (dev server has different middleware behavior).
- Test-mode browser may persist auth state from prior runs; if testing login UI, clear cookies for `localhost:3000` first.

## Devin Secrets Needed

- `apps/web/.env.local` already provisioned in this VM with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (used for test-account bootstrap; never log)
- No new external secrets required for token-only testing.
