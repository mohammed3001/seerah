import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
      <LoginForm />
      <p className="mt-6 text-center text-xs text-slate-500">
        نسيت كلمة المرور أو فقدت جهاز 2FA؟ تواصل مع super_admin آخر لإعادة التعيين.
      </p>
    </div>
  );
}
