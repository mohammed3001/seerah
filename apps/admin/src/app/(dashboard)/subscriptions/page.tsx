import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/shell/coming-soon";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SubscriptionsPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (ctx.admin.role !== "super_admin") redirect("/");
  const sections = visibleSections(ctx.admin.role);
  return (
    <>
      <Topbar sections={sections} adminEmail={ctx.admin.email} title="الاشتراكات" />
      <ComingSoon
        title="إدارة الاشتراكات"
        upcomingPr="C2"
        description="جدول الاشتراكات + فلاتر بالحالة، إجراءات Stripe (إلغاء، تمديد، رد مبلغ، منح برايم مجانًا)، وملخّص MRR/ARR/Churn."
      />
    </>
  );
}
