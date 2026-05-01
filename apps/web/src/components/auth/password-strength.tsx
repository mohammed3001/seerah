"use client";

import { passwordStrength } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

const colors = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-success",
  "bg-success",
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-200 ease-out-soft",
              i < score ? colors[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">قوة كلمة المرور: {label}</p>
    </div>
  );
}
