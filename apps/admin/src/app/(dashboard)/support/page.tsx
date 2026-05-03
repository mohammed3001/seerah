import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SupportPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin" && ctx.admin.role !== "support_agent") {
    redirect("/");
  }
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="الدعم الفني" />
      <ComingSoon
        title="مركز الدعم"
        upcomingPr="C3"
        description="صندوق التذاكر، الردّ بمحرّر نصوص، تغيير الحالة/الأولويّة، التعيين لفرد دعم، إجراءات جماعية، ملاحظات داخلية."
      />
    </>
  );
}
