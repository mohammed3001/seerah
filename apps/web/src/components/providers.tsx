"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@seerah/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <TooltipProvider delayDuration={150}>
        {children}
        <Toaster position="top-center" richColors closeButton dir="auto" />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
