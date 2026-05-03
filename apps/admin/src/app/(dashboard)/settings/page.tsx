import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin") redirect("/");
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="الإعدادات" />
      <ComingSoon
        title="الإعدادات العامة"
        upcomingPr="D2"
        description="إعدادات التطبيق، الدفع، البريد، إدارة فريق الأدمن، شريط الإعلان، وضع الصيانة، تبديل التسجيل/الذكاء الاصطناعي."
      />
    </>
  );
}
