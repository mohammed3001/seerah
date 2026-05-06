import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Card, Separator } from "@seerah/ui";

import { GoogleAuthButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-[400px] p-8 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="font-cairo text-3xl font-bold tracking-tight">سيرة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          سجّل الدخول لاستكمال بناء سيرتك الذاتية
        </p>
      </div>

      <Suspense fallback={<div className="h-[280px]" />}>
        <LoginForm />
      </Suspense>

      <div className="mt-3 text-end">
        <Link
          href="/auth/forgot-password"
          className="text-sm text-muted-foreground transition-colors hover:text-accent"
        >
          نسيت كلمة المرور؟
        </Link>
      </div>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">أو</span>
        <Separator className="flex-1" />
      </div>

      <GoogleAuthButton />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{" "}
        <Link
          href="/auth/register"
          className="font-medium text-accent transition-colors hover:underline"
        >
          سجّل الآن
        </Link>
      </p>
    </Card>
  );
}
