# Skill — Testing Seerah end-to-end

When to use: testing the auth, dashboard, or editor flows of `apps/web` (Next.js 15 + Supabase).

## Setup

```bash
cd /home/ubuntu/repos/seerah
pnpm install
cd apps/web
pnpm dev   # listens on http://localhost:3000
```

Required env in `apps/web/.env.local` (already populated when the user has provisioned secrets):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — used for the email-confirm bypass below
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

The live Supabase project has all 18 tables, RLS, and the `handle_new_user` trigger applied.

## Devin Secrets Needed

- `NEXT_PUBLIC_SUPABASE_URL` (org-scoped)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (org-scoped)
- `SUPABASE_SERVICE_ROLE_KEY` (org-scoped)

## Supabase quirks that bite during testing

1. **Email confirmation may be enabled** on this project. After `signUp`, the user has `email_confirmed_at: null` and login will fail with *"Email not confirmed"*. Two options:
   - Test the signup-success toast only, then stop. The toast *"تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد."* is correct behavior.
   - To proceed to login, manually confirm the user via the admin API:
     ```bash
     curl -X PUT "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/<user-id>" \
       -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
       -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
       -H "Content-Type: application/json" \
       -d '{"email_confirm": true}'
     ```
2. **Supabase rejects synthetic TLDs** (`.test`, `.local`, `.example`). Use `gmail.com`-style addresses for test users (`devin.test.<timestamp>@gmail.com`).
3. **`profiles` row is auto-inserted** by the `handle_new_user` trigger. To verify after signup:
   ```bash
   curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?id=eq.<user-id>&select=id,email,full_name,plan,max_resumes" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

## Standard adversarial test plan

Auth (every assertion would fail if the code were broken):

- Submit signup with weak password → inline Arabic error *"يجب أن تكون 8 أحرف على الأقل"*; form does not submit.
- Submit signup with terms unchecked → inline Arabic error *"يجب الموافقة على الشروط والأحكام"*.
- Submit signup with valid input → success toast + `auth.users` row + `profiles` row with `plan="free"`, `max_resumes=1`.
- Login with wrong password → toast *"بيانات الدخول غير صحيحة. حاول مرة أخرى."*; URL stays at `/auth/login`.
- Login with correct password → redirect to `/dashboard`; sidebar shows user + plan badge.
- `curl -I /dashboard` (no cookies) → `307` to `/auth/login?next=%2Fdashboard` (middleware-enforced, not RLS).

Dashboard + editor:

- Empty-state CTA *"أنشئ سيرتك الذاتية"* visible for fresh user.
- Click CTA → resume row created → redirect to `/dashboard/resume/<uuid>` → all 11 sections in sidebar.
- Click *"أضف سيرة ذاتية"* a second time on a free plan → upgrade modal *"ترقية الخطة"* (NOT a second resume row).
- In editor, click `−` zoom button → preview changes from 75% to 50%; both left and right edges of the A4 page card stay inside the scroll container (PR #2 BUG#3 regression check).

## RTL form interaction tips

- Form fields shift down when the password-strength meter appears. Re-click the field by its current y-coordinate before typing into `confirmPassword`.
- The terms checkbox click coordinate is to the right of the *"أوافق على"* label, not on the label itself.
- Use `triple_click` to clear an input before re-typing.

## Things that are NOT testable without extra setup

- `duplicateResumeAction` cross-user RLS scoping (would need 2 users + a public resume + a UI route).
- `reorderSectionItems` error propagation (would need DB tampering or RLS denial during update).
- AI auto-fill panel (no Anthropic key wired up by default).

## Cleanup

Test users + resumes are left in the live Supabase project. Delete via:
- Supabase Dashboard → Authentication → Users (deletes profile + cascades to resumes via FK)
- Or via admin API: `DELETE /auth/v1/admin/users/<id>` with the service role key.
