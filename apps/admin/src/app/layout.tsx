import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Seerah Admin",
  description: "لوحة إدارة Seerah",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
