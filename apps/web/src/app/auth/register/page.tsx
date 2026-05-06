import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Sparkles, FileText, Globe2 } from "lucide-react";

import { Card, Separator } from "@seerah/ui";

import { GoogleAuthButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "إنشاء حساب",
};

const benefits = [
  {
    icon: Sparkles,
    title: "كتابة بالذكاء الاصطناعي",
    description: "اكتب أوصافك المهنية بالعربية والإنجليزية في ثوانٍ",
  },
  {
    icon: FileText,
    title: "قوالب احترافية",
    description: "اختر من بين عشرات القوالب المُحسَّنة لأنظمة التتبع",
  },
  {
    icon: Globe2,
    title: "ثنائية اللغة",
    description: "احفظ كل قسم بالعربية والإنجليزية بنقرة واحدة",
  },
  {
    icon: CheckCircle2,
    title: "تحميل PDF فورًا",
    description: "صدّر سيرتك بجودة طباعة عالية وروابط مشاركة",
  },
];

export default function RegisterPage() {
  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_400px]">
      {/* Benefits panel — desktop only */}
      <section className="hidden flex-col justify-center lg:flex">
        <h2 className="font-cairo text-4xl font-bold leading-tight tracking-tight">
          سيرة ذاتية احترافية
          <br />
          في دقائق معدودة
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          انضم لآلاف المستخدمين وأنشئ سيرة ذاتية تفتح لك أبواب الفرص.
        </p>
        <ul className="mt-8 space-y-5">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <li key={b.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Card className="w-full max-w-[400px] justify-self-end p-8 shadow-card">
        <div className="mb-8 text-center">
          <h1 className="font-cairo text-3xl font-bold tracking-tight">سيرة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أنشئ حسابك المجاني وابدأ بناء سيرتك الذاتية
          </p>
        </div>

        <RegisterForm />

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">أو</span>
          <Separator className="flex-1" />
        </div>

        <GoogleAuthButton />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/auth/login"
            className="font-medium text-accent transition-colors hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>
      </Card>
    </div>
  );
}
