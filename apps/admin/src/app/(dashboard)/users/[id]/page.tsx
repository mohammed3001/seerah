import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SectionCard } from "@/components/dashboard/section-card";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { AdminNotes } from "@/components/users/admin-notes";
import { ChangePlanForm } from "@/components/users/change-plan-form";
import { DeleteAccountForm } from "@/components/users/delete-account-form";
import { DisableToggle } from "@/components/users/disable-toggle";
import { ResetPasswordButton } from "@/components/users/reset-password-button";
import { SendEmailForm } from "@/components/users/send-email-form";
import { getCurrentAdmin } from "@/lib/auth/current";
import { isResendConfigured } from "@/lib/email";
import { getUserDetail } from "@/lib/users/detail";
import { PLAN_BADGE_CLASSES, PLAN_LABELS_AR } from "@/lib/users/types";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};

const SUB_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  trialing: "تجريبي",
  past_due: "متأخر",
  canceled: "ملغى",
  incomplete: "غير مكتمل",
  incomplete_expired: "منتهي غير مكتمل",
  unpaid: "غير مدفوع",
  paused: "متوقف",
};

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }

  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { profile, resumes, subscriptions, tickets, aiTotals, aiBreakdown, adminNotes } = detail;
  const sections = visibleSections(ctx.admin.role);
  const canDestroy = ctx.admin.role === "super_admin";
  const resendOn = isResendConfigured();

  // Public resumes are served by apps/web — admin domain has no /:slug route.
  const publicAppUrl = (process.env["NEXT_PUBLIC_APP_URL"] ?? "https://seerah.com").replace(
    /\/$/,
    "",
  );

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title={profile.full_name ?? profile.email}
        subtitle="ملف المستخدم الكامل والإجراءات الإدارية"
      />

      <main className="flex-1 space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {/* Breadcrumb */}
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          عودة لقائمة المستخدمين
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-medium text-slate-600">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.full_name ?? profile.email).slice(0, 1).toUpperCase()
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">{profile.full_name ?? "—"}</h1>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    PLAN_BADGE_CLASSES[profile.plan],
                  )}
                >
                  {PLAN_LABELS_AR[profile.plan]}
                </span>
                {profile.is_disabled ? (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                    معطّل
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    مفعّل
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700" dir="ltr">
                {profile.email}
              </p>
              <p className="text-xs text-slate-500" dir="ltr">
                {profile.id}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs md:grid-cols-4">
            <Field
              label="تاريخ التسجيل"
              value={format(new Date(profile.created_at), "yyyy-MM-dd")}
              dir="ltr"
            />
            <Field
              label="آخر نشاط"
              value={
                profile.last_seen_at
                  ? format(new Date(profile.last_seen_at), "yyyy-MM-dd HH:mm")
                  : "—"
              }
              dir="ltr"
            />
            <Field
              label="انتهاء الخطة"
              value={
                profile.plan_expires_at
                  ? format(new Date(profile.plan_expires_at), "yyyy-MM-dd")
                  : "—"
              }
              dir="ltr"
            />
            <Field label="حد السير" value={String(profile.max_resumes)} />
            <Field label="الدولة" value={profile.billing_country ?? "—"} dir="ltr" />
            <Field label="رمز الإحالة" value={profile.referral_code ?? "—"} dir="ltr" />
            <Field
              label="بريد التسويق"
              value={profile.marketing_emails_enabled ? "مفعّل" : "معطّل"}
            />
            <Field label="اللغة" value={profile.locale} dir="ltr" />
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* LEFT 2/3: data sections */}
          <div className="space-y-4 lg:col-span-2">
            <SectionCard title="السير الذاتية" subtitle={`${resumes.length} سيرة (آخر ٥٠)`} flush>
              {resumes.length === 0 ? (
                <p className="px-5 py-6 text-xs text-slate-400">لا توجد سير ذاتية بعد.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {resumes.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900">{r.title}</p>
                        <p className="text-[11px] text-slate-500" dir="ltr">
                          {r.template_id} · {r.language} · اكتمال {r.completion_score}% ·{" "}
                          {r.views_count.toLocaleString("ar-SA")} مشاهدة
                        </p>
                      </div>
                      <a
                        href={`${publicAppUrl}/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                        معاينة
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="سجل الاشتراكات" subtitle={`${subscriptions.length} اشتراك`} flush>
              {subscriptions.length === 0 ? (
                <p className="px-5 py-6 text-xs text-slate-400">لا توجد اشتراكات.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {subscriptions.map((s) => (
                    <li key={s.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900" dir="ltr">
                          {s.stripe_subscription_id ?? s.id.slice(0, 8)}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          {SUB_STATUS_LABELS[s.status ?? ""] ?? s.status ?? "—"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500" dir="ltr">
                        {s.provider ?? "—"} · {s.currency ?? ""} ·{" "}
                        {s.current_period_start
                          ? format(new Date(s.current_period_start), "yyyy-MM-dd")
                          : "—"}{" "}
                        →{" "}
                        {s.current_period_end
                          ? format(new Date(s.current_period_end), "yyyy-MM-dd")
                          : "—"}
                        {s.cancel_at_period_end ? " · سيُلغى" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="استخدام الذكاء الاصطناعي" subtitle="آخر ٣٠ يوماً">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                  <p className="text-xs text-slate-500">عدد الطلبات</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {aiTotals.last30Days.toLocaleString("ar-SA")}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                  <p className="text-xs text-slate-500">إجمالي التوكنات</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {aiTotals.last30DaysTokens.toLocaleString("ar-SA")}
                  </p>
                </div>
              </div>

              {aiBreakdown.length > 0 ? (
                <table className="mt-4 min-w-full text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="text-right font-medium">النوع</th>
                      <th className="text-right font-medium">الطلبات</th>
                      <th className="text-right font-medium">التوكنات</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {aiBreakdown.map((row) => (
                      <tr key={row.action_type}>
                        <td className="py-1" dir="ltr">
                          {row.action_type}
                        </td>
                        <td className="py-1">{row.count.toLocaleString("ar-SA")}</td>
                        <td className="py-1">{row.total_tokens.toLocaleString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </SectionCard>

            <SectionCard title="تذاكر الدعم" subtitle={`${tickets.length} تذكرة`} flush>
              {tickets.length === 0 ? (
                <p className="px-5 py-6 text-xs text-slate-400">لا توجد تذاكر.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {tickets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900">{t.subject}</p>
                        <p className="text-[11px] text-slate-500" dir="ltr">
                          {format(new Date(t.created_at), "yyyy-MM-dd HH:mm", { locale: arSA })}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="الملاحظات الداخلية" subtitle="لا يراها المستخدم">
              <AdminNotes userId={profile.id} notes={adminNotes} />
            </SectionCard>
          </div>

          {/* RIGHT 1/3: admin actions */}
          <aside className="space-y-4">
            <SectionCard title="تغيير الخطة">
              {canDestroy ? (
                <ChangePlanForm
                  userId={profile.id}
                  currentPlan={profile.plan}
                  currentExpiresAt={profile.plan_expires_at}
                />
              ) : (
                <p className="text-xs text-slate-400">super_admin فقط يستطيع تغيير الخطط.</p>
              )}
            </SectionCard>

            <SectionCard title="إعادة تعيين كلمة المرور">
              <ResetPasswordButton userId={profile.id} email={profile.email} />
            </SectionCard>

            <SectionCard title={profile.is_disabled ? "تفعيل الحساب" : "تعطيل الحساب"}>
              {canDestroy ? (
                <DisableToggle
                  userId={profile.id}
                  isDisabled={profile.is_disabled}
                  currentReason={profile.disabled_reason}
                />
              ) : (
                <p className="text-xs text-slate-400">
                  super_admin فقط يستطيع تعطيل/تفعيل الحسابات.
                </p>
              )}
            </SectionCard>

            <SectionCard title="إرسال بريد مباشر">
              <SendEmailForm
                userId={profile.id}
                email={profile.email}
                resendConfigured={resendOn}
              />
            </SectionCard>

            <SectionCard title="حذف الحساب">
              {canDestroy ? (
                <DeleteAccountForm userId={profile.id} email={profile.email} />
              ) : (
                <p className="text-xs text-slate-400">super_admin فقط يستطيع حذف الحسابات.</p>
              )}
            </SectionCard>
          </aside>
        </div>
      </main>
    </>
  );
}

function Field({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-slate-800" dir={dir}>
        {value}
      </dd>
    </div>
  );
}
