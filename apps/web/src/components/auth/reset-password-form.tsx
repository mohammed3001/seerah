"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, FloatingInput } from "@seerah/ui";

import { resetPasswordAction } from "@/app/auth/reset-password/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";

import { PasswordStrengthMeter } from "./password-strength";

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const password = watch("password");

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    try {
      const result = await resetPasswordAction(values.password);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSubmitted(true);
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-card border border-success/30 bg-success/5 p-6 text-center"
        role="status"
      >
        <CheckCircle2
          className="size-10 text-success"
          style={{ animation: "scale-in 320ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
        <p className="font-medium">تم تحديث كلمة المرور</p>
        <p className="text-sm text-muted-foreground">سيتم تحويلك لصفحة تسجيل الدخول…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <FloatingInput
          label="كلمة المرور الجديدة"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          error={errors.password?.message}
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <FloatingInput
        label="تأكيد كلمة المرور"
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />
      <Button type="submit" size="xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : "تحديث كلمة المرور"}
      </Button>
    </form>
  );
}
