import { redirect } from "next/navigation";

import { Sidebar } from "@/components/shell/sidebar";
import { visibleSections } from "@/components/shell/nav-config";
import { getCurrentAdmin } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The shell wrapping every authenticated admin page.  Middleware already
 * guards the route, but we re-check here so a Server Component child can
 * always assume `getCurrentAdmin()` succeeded — and so the sidebar gets
 * the role data without an extra round-trip.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const sections = visibleSections(ctx.admin.role);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <Sidebar
        sections={sections}
        adminEmail={ctx.admin.email}
        adminRole={ctx.admin.role}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
