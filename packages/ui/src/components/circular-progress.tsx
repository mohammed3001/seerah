import * as React from "react";

import { cn } from "../lib/cn";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

/**
 * Animated circular progress indicator. Uses SVG stroke-dashoffset for the
 * fill, with smooth Apple-style easing.
 */
export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  className,
  ...props
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--accent))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out-soft"
        />
      </svg>
      {showLabel ? (
        <span className="absolute text-xs font-semibold tabular-nums">{Math.round(clamped)}%</span>
      ) : null}
    </div>
  );
}
