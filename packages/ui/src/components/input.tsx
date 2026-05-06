"use client";

import * as React from "react";

import { cn } from "../lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        // CV Lite spec: 48px height, 8px radius, 1px gray border, 12px
        // vertical padding, 16px horizontal.  Focus -> 2px primary blue
        // border + light blue glow ring (handled via shadow-focus-ring).
        "flex h-12 w-full rounded-input border border-input bg-background px-4 py-3 text-[15px] leading-6 text-foreground",
        "transition-[border-color,box-shadow] duration-200 ease-out-soft",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:border-border/60",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
