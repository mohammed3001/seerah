import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AiPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin") redirect("/");
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="الذكاء الاصطناعي" />
      <ComingSoon
        title="تحليلات الذكاء الاصطناعي"
        upcomingPr="D1"
        description="إحصائيات الاستخدام، الميزات الأكثر طلبًا، تكلفة تقديرية، نسبة الأخطاء، إدارة حدود الاستخدام بالمستخدم، وزرّ إيقاف عام للطوارئ."
      />
    </>
  );
}
