"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@seerah/ui";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {!mounted ? (
        <Sun className="size-5" />
      ) : isDark ? (
        <Sun className="size-5 transition-transform duration-200 ease-out-soft" />
      ) : (
        <Moon className="size-5 transition-transform duration-200 ease-out-soft" />
      )}
    </Button>
  );
}
