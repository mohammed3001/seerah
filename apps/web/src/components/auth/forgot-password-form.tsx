"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, FloatingInput } from "@seerah/ui";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSubmitted(true);
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
        <p className="font-medium">تم إرسال الرابط بنجاح</p>
        <p className="text-sm text-muted-foreground">
          راجع بريدك الإلكتروني لإكمال إعادة تعيين كلمة المرور.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FloatingInput
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        dir="ltr"
        {...register("email")}
        error={errors.email?.message}
      />
      <Button type="submit" size="xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : "إرسال رابط إعادة التعيين"}
      </Button>
    </form>
  );
}
