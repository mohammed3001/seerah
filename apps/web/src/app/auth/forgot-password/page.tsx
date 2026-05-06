import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@seerah/ui";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-[400px] p-8 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="font-cairo text-3xl font-bold tracking-tight">استعادة كلمة المرور</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        تذكرت كلمة المرور؟{" "}
        <Link
          href="/auth/login"
          className="font-medium text-accent transition-colors hover:underline"
        >
          تسجيل الدخول
        </Link>
      </p>
    </Card>
  );
}
