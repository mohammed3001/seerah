import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-50"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#635BFF] text-lg font-bold tracking-tight">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">لوحة إدارة Seerah</h1>
          <p className="mt-1 text-sm text-slate-400">
            وصول داخلي فقط — كل الإجراءات مسجَّلة في سجلّ التدقيق.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
