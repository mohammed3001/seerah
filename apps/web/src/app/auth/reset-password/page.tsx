import type { Metadata } from "next";

import { Card } from "@seerah/ui";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور",
};

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-[400px] p-8 shadow-card">
      <div className="mb-8 text-center">
        <h1 className="font-cairo text-3xl font-bold tracking-tight">كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm text-muted-foreground">اختر كلمة مرور قوية لحسابك</p>
      </div>
      <ResetPasswordForm />
    </Card>
  );
}
