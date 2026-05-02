import Link from "next/link";

import { getDashboardSession } from "@/lib/dashboard/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SupportForm } from "./support-form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "قيد المراجعة",
  in_progress: "تحت المعالجة",
  resolved: "تم الحل",
  closed: "مغلق",
};

export default async function SupportPage() {
  const session = await getDashboardSession();

  const supabase = await createSupabaseServerClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-16 pt-10">
      <header className="mb-8 space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:underline">
            ← الرجوع للوحة التحكم
          </Link>
        </p>
        <h1 className="text-3xl font-bold">الدعم الفني</h1>
        <p className="text-muted-foreground">
          أرسل طلبك وسنتواصل معك خلال يوم عمل واحد على بريدك المسجَّل.
        </p>
      </header>

      <section className="mb-12">
        <SupportForm />
      </section>

      {tickets && tickets.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">طلباتك السابقة</h2>
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{t.subject}</span>
                  <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
