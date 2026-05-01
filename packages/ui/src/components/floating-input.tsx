"use client";

import * as React from "react";

import { cn } from "../lib/cn";

export interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Apple-style floating-label input. Label slides up when the field has focus
 * or content. Uses the `peer-placeholder-shown` Tailwind trick.
 */
export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, id, type = "text", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="relative w-full">
        <input
          id={inputId}
          ref={ref}
          type={type}
          placeholder=" "
          className={cn(
            "peer block h-14 w-full rounded-input border border-input bg-background px-3 pt-5 pb-2 text-sm",
            "transition-colors duration-200 ease-out-soft",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute start-3 top-1.5 z-10 origin-[0] text-xs font-medium text-muted-foreground transition-all duration-200 ease-out-soft",
            "peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground/70",
            "peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-accent",
            error && "peer-focus:text-destructive",
          )}
        >
          {label}
        </label>
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
FloatingInput.displayName = "FloatingInput";
