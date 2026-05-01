import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* Animated background shapes — pure CSS, no images. */}
      <div className="auth-bg-shape -start-32 top-12 size-72 bg-accent/40" />
      <div
        className="auth-bg-shape -end-24 top-1/3 size-96 bg-fuchsia-500/30"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="auth-bg-shape start-1/3 -bottom-32 size-80 bg-sky-400/30"
        style={{ animationDelay: "3s" }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <Link href="/" className="font-cairo text-xl font-semibold tracking-tight">
          سيرة
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}
