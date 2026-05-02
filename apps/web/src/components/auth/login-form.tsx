"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, FloatingInput } from "@seerah/ui";

import { track } from "@/lib/analytics/posthog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        toast.error("بيانات الدخول غير صحيحة. حاول مرة أخرى.");
        return;
      }
      track("login", { method: "password" });
      toast.success("مرحبًا بعودتك");
      router.replace(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
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
      <FloatingInput
        label="كلمة المرور"
        type="password"
        autoComplete="current-password"
        {...register("password")}
        error={errors.password?.message}
      />
      <Button type="submit" size="xl" disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
