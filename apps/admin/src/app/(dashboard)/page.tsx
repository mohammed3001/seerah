import { format } from "date-fns";

import {
  AiActivityChart,
  MonthlyRevenueChart,
  NewUsersChart,
  PlanDistributionChart,
  TemplateUsageChart,
} from "@/components/dashboard/charts";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  RecentSignupsList,
  RecentSubscriptionsList,
  RecentTicketsList,
} from "@/components/dashboard/recent-activity";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { SectionCard } from "@/components/dashboard/section-card";
import { visibleSections } from "@/components/shell/nav-config";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentAdmin } from "@/lib/auth/current";
import { getDashboardData } from "@/lib/dashboard/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardOverviewPage() {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");

  const sections = visibleSections(ctx.admin.role);
  const data = await getDashboardData();
  const generated = format(new Date(data.generatedAt), "yyyy-MM-dd HH:mm");

  return (
    <>
      <Topbar
        sections={sections}
        adminEmail={ctx.admin.email}
        title="لوحة التحكم"
        subtitle={`آخر تحديث: ${generated}`}
      />

      <main className="flex-1 space-y-8 px-4 py-6 lg:px-8 lg:py-8">
        {/* Metric cards */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">المؤشرات الرئيسية</h2>
            <RefreshButton />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {data.metrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </div>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="مستخدمون جدد"
            subtitle="آخر ٣٠ يومًا"
            className="lg:col-span-2"
          >
            <NewUsersChart data={data.newUsersByDay} />
          </SectionCard>

          <SectionCard title="توزيع الخطط" subtitle="جميع المستخدمين">
            <PlanDistributionChart data={data.planDistribution} />
          </SectionCard>

          <SectionCard title="استخدام القوالب" subtitle="عدد السير لكل قالب (الأعلى ٨)">
            <TemplateUsageChart data={data.templateUsage} />
          </SectionCard>

          <SectionCard
            title="الإيرادات الشهرية"
            subtitle="آخر ١٢ شهرًا (Stripe، تقديرية)"
          >
            <MonthlyRevenueChart data={data.monthlyRevenueUsd} />
          </SectionCard>

          <SectionCard
            title="نشاط الذكاء الاصطناعي"
            subtitle="إجمالي الطلبات اليومية، آخر ٣٠ يومًا"
          >
            <AiActivityChart data={data.aiActivityByDay} />
          </SectionCard>
        </section>

        {/* Recent activity */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="آخر التسجيلات" subtitle="آخر ٢٠ مستخدمًا" flush>
            <RecentSignupsList items={data.recent.signups} />
          </SectionCard>

          <SectionCard title="آخر تذاكر الدعم" subtitle="آخر ٥ تذاكر" flush>
            <RecentTicketsList items={data.recent.tickets} />
          </SectionCard>

          <SectionCard title="آخر أحداث الاشتراك" subtitle="آخر ٥ تحديثات" flush>
            <RecentSubscriptionsList items={data.recent.subscriptionEvents} />
          </SectionCard>
        </section>
      </main>
    </>
  );
}
