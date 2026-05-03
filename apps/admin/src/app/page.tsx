import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Root page placeholder.  The full sidebar shell + dashboard land in
 * PR-Admin-A3.  Until then, signed-in admins see a holding page that
 * confirms their session is valid; signed-out users get bounced to /login
 * by the middleware.
 */
export default async function AdminHomePage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-slate-900"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">مرحبًا 👋</h1>
        <p className="mb-1 text-sm text-slate-600">
          تسجيل الدخول كـ <span className="font-medium" dir="ltr">{ctx.admin.email}</span>
        </p>
        <p className="mb-5 text-sm text-slate-500">
          الدور: <span className="font-mono text-xs">{ctx.admin.role}</span>
        </p>
        <p className="mb-5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          الواجهة الكاملة (sidebar + dashboard + إدارة المستخدمين/السير/القوالب…) ستصل في PRs لاحقة
          <code dir="ltr" className="mx-1 rounded bg-slate-100 px-1 text-xs">
            A3
          </code>
          فما فوق.
        </p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>
    </main>
  );
}
