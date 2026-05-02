"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, Checkbox, FloatingInput, Label } from "@seerah/ui";

import { track } from "@/lib/analytics/posthog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

import { PasswordStrengthMeter } from "./password-strength";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = watch("password");
  const acceptTerms = watch("acceptTerms");

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      track("signup", { method: "password" });
      toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد.");
      router.replace("/auth/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FloatingInput
        label="الاسم الكامل"
        autoComplete="name"
        {...register("fullName")}
        error={errors.fullName?.message}
      />
      <FloatingInput
        label="البريد الإلكتروني"
        type="email"
        autoComplete="email"
        dir="ltr"
        {...register("email")}
        error={errors.email?.message}
      />
      <div className="space-y-2">
        <FloatingInput
          label="كلمة المرور"
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

      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="accept-terms"
          checked={acceptTerms}
          onCheckedChange={(value) => setValue("acceptTerms", value === true, { shouldValidate: true })}
        />
        <div className="space-y-1">
          <Label htmlFor="accept-terms" className="text-sm leading-tight">
            أوافق على{" "}
            <Link href="/legal/terms" className="text-accent hover:underline">
              الشروط
            </Link>{" "}
            و{" "}
            <Link href="/legal/privacy" className="text-accent hover:underline">
              سياسة الخصوصية
            </Link>
          </Label>
          {errors.acceptTerms ? (
            <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" size="xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : "إنشاء الحساب"}
      </Button>
    </form>
  );
}
