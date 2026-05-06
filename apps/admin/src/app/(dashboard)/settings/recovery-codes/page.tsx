import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { RegenerateRecoveryCodesPanel } from "@/components/settings/regenerate-recovery-codes-panel";
import { getCurrentAdmin } from "@/lib/auth/current";
import { redirect } from "next/navigation";

import { loadRecoveryCodesView } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RecoveryCodesPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  const sections = visibleSections(ctx.admin.role);
  const view = await loadRecoveryCodesView();

  const generatedLabel = view.generatedAt
    ? new Date(view.generatedAt).toLocaleString("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "لم يتمّ التوليد بعد";

  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="رموز الاسترداد" />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            رموز الاسترداد للمصادقة الثنائيّة
          </h1>
          <p className="text-sm text-slate-600">
            تُستخدم هذه الرموز لتسجيل الدخول إذا فقدت تطبيق Authenticator. يُستهلَك كلّ رمز مرّة
            واحدة، ويتمّ تسجيل عمليّة الاستخدام في سجلّ التدقيق. توليد دفعة جديدة يُلغي الدفعة
            السابقة فورًا.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">الرموز غير المستخدَمة</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900">{view.remaining}</dd>
            </div>
            <div>
              <dt className="text-slate-500">آخر توليد</dt>
              <dd className="mt-1 text-base text-slate-900">{generatedLabel}</dd>
            </div>
          </dl>
          {view.remaining === 0 ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              لا توجد رموز نشطة. وَلِّد دفعة جديدة قبل أن تفقد وصولك إلى تطبيق Authenticator.
            </p>
          ) : view.remaining <= 2 ? (
            <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              عدد الرموز المتبقّية منخفض. يُنصح بتوليد دفعة جديدة.
            </p>
          ) : null}
        </section>

        <RegenerateRecoveryCodesPanel />
      </main>
    </>
  );
}
