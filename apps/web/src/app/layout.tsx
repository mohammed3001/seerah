import type { Metadata, Viewport } from "next";

import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { Providers } from "@/components/providers";
import { cairo, manrope, premiumFontClassNames, sfPro } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "سيرة — منصة بناء السيرة الذاتية",
    template: "%s · سيرة",
  },
  description:
    "منصة سيرة لبناء سيرة ذاتية احترافية بالذكاء الاصطناعي — قوالب احترافية، تحرير مرن، وتحميل PDF و PNG.",
  applicationName: "سيرة",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${sfPro.variable} ${cairo.variable} ${manrope.variable} ${premiumFontClassNames}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <PageViewTracker />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
