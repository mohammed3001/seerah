"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/cn";

/**
 * CV Lite button system.
 *
 *  primary     bg=Primary Blue, white text, shadow elevated, 8px radius.
 *              Hover -> darker blue, active -> shadow prominent.  Default.
 *  secondary   white bg, 2px Primary Blue border, blue text.  No shadow.
 *              Hover -> tinted blue background.
 *  outline     neutral gray-bordered button (kept for legacy non-CTA
 *              affordances; not part of the CV Lite spec but used in the
 *              editor / dashboard for tertiary, color-neutral actions).
 *  ghost       transparent, neutral text, hover -> light gray.
 *  destructive red bg, white text.
 *  link        tertiary text link style (transparent, blue text, hover
 *              underline).  No height, no padding, inline.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button font-semibold transition-all duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground shadow-elevated hover:bg-accent-hover active:bg-accent-hover active:shadow-prominent disabled:bg-accent-disabled disabled:shadow-none",
        secondary:
          "border-2 border-accent bg-background text-accent hover:bg-accent-tint hover:border-accent-hover hover:text-accent-hover active:bg-accent-tint active:border-accent-hover active:text-accent-hover",
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:border-foreground/20",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground shadow-elevated hover:opacity-90",
        link: "text-accent-hover hover:text-accent hover:underline underline-offset-4 rounded-none px-0 h-auto",
      },
      size: {
        // Compact size (action buttons in lists, AI tabs, table-row CTAs).
        // Stays under the 48px touch-target floor by design — only used on
        // desktop-only secondary affordances.
        sm: "h-9 px-3 text-sm",
        // Default — meets the CV Lite 48px minimum touch target.
        md: "h-12 px-6 text-[15px]",
        // Prominent CTA — wider horizontal padding (44px per spec).
        lg: "h-12 px-11 text-[15px]",
        // Full-width prominent CTA (auth / onboarding hero buttons).
        xl: "h-12 px-11 text-[15px] w-full",
        // Icon-only buttons.  48px square to match touch-target floor.
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
