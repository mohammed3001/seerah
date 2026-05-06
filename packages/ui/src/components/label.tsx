"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "../lib/cn";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // CV Lite spec: 14px / weight 600 / color #141414, 8px margin-bottom
    // owned by the parent layout (left to consumers since labels appear
    // both above inputs and inline with checkboxes/switches).
    className={cn("text-sm font-semibold leading-none text-foreground", className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
