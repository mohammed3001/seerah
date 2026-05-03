import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function UsersPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="إدارة المستخدمين"
        subtitle="جدول كامل + بحث + فلاتر + إجراءات أدمن"
      />
      <ComingSoon
        title="إدارة المستخدمين"
        upcomingPr="B1"
        description="جدول كامل لجميع المستخدمين مع بحث/فلتر/تصدير CSV، وصفحة تفصيلية لكل مستخدم بإجراءات يدوية (تغيير الخطة، تعطيل/تفعيل، حذف، ملاحظات داخلية، إرسال بريد مباشر)."
      />
    </>
  );
}
