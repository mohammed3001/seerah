"use client";

import { Eye, EyeOff } from "lucide-react";

import { Switch } from "@seerah/ui";

import { cn } from "@/lib/utils";

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

export function VisibilityToggle({ value, onChange, className }: Props) {
  return (
    <label className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <Switch checked={value} onCheckedChange={onChange} />
      {value ? (
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3.5" /> ظاهر في السيرة
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <EyeOff className="size-3.5" /> مخفي
        </span>
      )}
    </label>
  );
}
