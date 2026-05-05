/**
 * Developer-only template gallery — renders every entry in the in-code
 * registry (`apps/web/src/templates/index.tsx`) against the same sample
 * resume so visual regressions are obvious at a glance.
 *
 * Gated on two layers:
 *
 *   1. **`NODE_ENV !== "production"`** — production builds 404 the route
 *      so it never ships to end users.  Vercel preview deployments and
 *      local dev still see it.
 *   2. **Dashboard layout** — wraps every page under `(dashboard)/` in
 *      `DashboardLayoutShell`, which calls `getDashboardSession()` and
 *      redirects unauthenticated users to /auth/login.  So even on a
 *      preview deployment a stranger can't see the gallery without
 *      logging in.
 *
 * The gallery uses the same `RenderTemplate` entrypoint as the export
 * route at `/render/[id]`, so what you see here is exactly what users
 * see in their PDF/PNG export.
 */

import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shell";
import { getDashboardSession } from "@/lib/dashboard/get-session";
import { RenderTemplate, TEMPLATE_REGISTRY } from "@/templates";
import { buildSampleResume } from "@/templates/_sample";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "معرض القوالب (تطوير)",
  robots: { index: false, follow: false },
};

interface SearchParams {
  lang?: string;
  mode?: string;
}

interface Params {
  searchParams: Promise<SearchParams>;
}

export default async function DevTemplatesPage({ searchParams }: Params) {
  if (process.env["NODE_ENV"] === "production") notFound();

  const session = await getDashboardSession();
  const search = await searchParams;
  const language: "ar" | "en" = search.lang === "en" ? "en" : "ar";
  const mode: "light" | "dark" = search.mode === "dark" ? "dark" : "light";

  const sample = buildSampleResume();

  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title="معرض القوالب (تطوير)"
      breadcrumb={[{ label: "سيرتي", href: "/dashboard" }, { label: "تطوير" }, { label: "القوالب" }]}
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
          <p className="font-medium">صفحة تطوير فقط (لا تظهر في الإنتاج).</p>
          <p>
            اللغة الحالية:{" "}
            <a className="underline" href={`?lang=ar&mode=${mode}`}>
              ar
            </a>{" "}
            ·{" "}
            <a className="underline" href={`?lang=en&mode=${mode}`}>
              en
            </a>
            {" — "}
            الوضع:{" "}
            <a className="underline" href={`?lang=${language}&mode=light`}>
              light
            </a>{" "}
            ·{" "}
            <a className="underline" href={`?lang=${language}&mode=dark`}>
              dark
            </a>
          </p>
        </div>

        <ul className="grid gap-8">
          {TEMPLATE_REGISTRY.map((meta) => (
            <li
              key={meta.id}
              className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-950"
            >
              <header className="flex items-baseline justify-between border-b px-4 py-3">
                <div>
                  <h2 className="font-semibold">{meta.name_ar}</h2>
                  <p className="text-xs text-muted-foreground">
                    {meta.id} · {meta.category} · {meta.is_premium ? "مدفوع" : "مجاني"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{meta.tagline_ar}</p>
              </header>
              <div className="bg-slate-100 p-4 dark:bg-slate-900">
                <div className="mx-auto w-fit shadow-lg">
                  <RenderTemplate
                    templateId={meta.id}
                    data={sample}
                    language={language}
                    theme={{ mode, primaryColor: meta.default_color }}
                    isExport={false}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  );
}
