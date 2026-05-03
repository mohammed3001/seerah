import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TemplatesPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "template_manager") {
    redirect("/");
  }
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="القوالب"
      />
      <ComingSoon
        title="إدارة القوالب"
        upcomingPr="C1"
        description="رفع صور thumbnail/preview، تعديل metadata (اسم/وصف عربي/إنجليزي/فئة/تاريخ)، تبديل مجاني↔مدفوع/مفعّل↔معطّل، ترتيب drag-and-drop."
      />
    </>
  );
}
