import { DashboardSessionProvider } from "@/components/dashboard/session-provider";
import { getDashboardSession } from "@/lib/dashboard/get-session";

export default async function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();
  return <DashboardSessionProvider session={session}>{children}</DashboardSessionProvider>;
}
