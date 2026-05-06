import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/cn";

// CV Lite badge system.  Solid variants (success / warning / feature)
// match the spec's "status badge" shape (colored fill, white or dark
// text).  Tinted variants (accent / success-tint / destructive-tint /
// gold) are kept for inline status callouts where a solid badge would
// be too prominent.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        // Solid status — spec: 12px text, weight 600.
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        // Feature tag — solid blue, square-ish 4px radius.
        feature: "bg-accent text-accent-foreground rounded-tag font-bold",
        accent: "bg-accent/10 text-accent",
        "success-tint": "bg-success/10 text-success",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        gold: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
