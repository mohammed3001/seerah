import { Crown, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@seerah/ui";

import { getDashboardSession } from "@/lib/dashboard/get-session";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

const UNLOCKED = [
  "كل القوالب المميزة (10+)",
  "5 سير ذاتية",
  "100 طلب ذكاء اصطناعي يوميًا",
  "تصدير PDF/PNG غير محدود",
  "بدون علامة مائية",
  "تخصيص رابط السيرة",
  "حماية بكلمة مرور",
  "أقسام مخصصة للمؤتمرات والعمل التطوعي",
  "أولوية الدعم",
];

export default async function SubscriptionSuccessPage({ searchParams }: PageProps) {
  // Trigger session check so unauthenticated users get redirected to /auth/login.
  await getDashboardSession();
  await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-lg dark:bg-amber-500/20 dark:text-amber-300">
          <Crown className="size-10" />
        </div>
      </div>

      <h1 className="mt-8 text-3xl font-bold">مرحبًا بك في برايم 👑</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        تمت ترقية حسابك بنجاح. شكرًا لاختيارك Seerah — نحن متحمّسون لمساعدتك في صنع سيرة تستحقك.
      </p>

      <ul className="mt-8 grid w-full gap-2 text-right text-sm sm:grid-cols-2">
        {UNLOCKED.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-card border border-border bg-card/60 p-3"
          >
            <Sparkles className="mt-0.5 size-4 flex-none text-amber-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard">ابدأ إنشاء سيرتك</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/subscription">إدارة الاشتراك</Link>
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        قد تستغرق الترقية حتى دقيقة لتظهر على لوحة التحكم. أعد تحميل الصفحة إذا لم تظهر فورًا.
      </p>
    </main>
  );
}
