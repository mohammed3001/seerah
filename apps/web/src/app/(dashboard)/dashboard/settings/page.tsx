import { DashboardShell } from "@/components/dashboard/shell";
import { getDashboardSession } from "@/lib/dashboard/get-session";

import { DeleteAccountForm } from "./delete-account-form";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const session = await getDashboardSession();

  return (
    <DashboardShell
      user={{
        fullName: session.profile.full_name,
        email: session.email,
        avatarUrl: session.profile.avatar_url,
        plan: session.profile.plan,
      }}
      title="الإعدادات"
      breadcrumb={[{ label: "الإعدادات" }]}
    >
      <div className="space-y-8">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">الحساب</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">الاسم</dt>
              <dd className="mt-0.5 font-medium">{session.profile.full_name ?? "بدون اسم"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">البريد الإلكتروني</dt>
              <dd className="mt-0.5 font-medium" dir="ltr">
                {session.email}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">الخطة</dt>
              <dd className="mt-0.5 font-medium">
                {session.profile.plan === "free"
                  ? "مجانية"
                  : session.profile.plan === "prime"
                    ? "برايم"
                    : "أعمال"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-lg font-semibold text-destructive">حذف الحساب</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            سيتم حذف حسابك وكل بياناتك (السير الذاتية والصور والتذاكر) نهائيًا. لا يمكن
            التراجع عن هذا الإجراء.
          </p>
          {session.profile.plan !== "free" ? (
            <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              لديك اشتراك نشط — يُنصح بإلغاء الاشتراك من{" "}
              <a className="underline" href="/subscription">
                صفحة الاشتراك
              </a>{" "}
              أوّلًا حتى لا تُحاسَب على دورة فوترة جديدة.
            </p>
          ) : null}
          <div className="mt-6">
            <DeleteAccountForm email={session.email} />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
