import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ResumesPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin") redirect("/");
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="السير الذاتية"
      />
      <ComingSoon
        title="إدارة السير الذاتية"
        upcomingPr="B2"
        description="جدول كامل لكل السير، بحث وفلتر، حذف، تغيير القالب، علم 'مميزة' للعرض على الواجهة."
      />
    </>
  );
}
