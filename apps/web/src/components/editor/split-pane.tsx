"use client";

import { GripVertical } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SplitPaneProps {
  /** The leading pane (logical "first" side; visual right under `dir="rtl"`). */
  start: React.ReactNode;
  /** The trailing pane (logical "second" side; visual left under `dir="rtl"`). */
  end: React.ReactNode;
  /** localStorage key for the persisted ratio (0..1).  Pass `null` to disable. */
  storageKey?: string | null;
  /** Default ratio for the leading pane when no stored value is found. */
  defaultStartRatio?: number;
  /** Minimum ratio for the leading pane. */
  minStartRatio?: number;
  /** Maximum ratio for the leading pane. */
  maxStartRatio?: number;
  /**
   * Tailwind breakpoint at which the split is enabled.  Below this width the
   * panes stack vertically and the divider is hidden.  Defaults to `lg`.
   */
  breakpoint?: "md" | "lg" | "xl";
  /** Optional class for the outer wrapper. */
  className?: string;
  /** Optional class for the leading-pane wrapper. */
  startClassName?: string;
  /** Optional class for the trailing-pane wrapper. */
  endClassName?: string;
}

const DEFAULT_RATIO = 0.55;
const KEYBOARD_STEP = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A two-pane horizontal split with a draggable divider that lets the user
 * resize the ratio between the leading and trailing panes.  The component is
 * RTL-aware: the dragged ratio always describes the *logical* leading pane,
 * which renders on the right under `dir="rtl"`.  Pointer-event handlers run
 * during a drag and update a CSS custom property (`--start-basis`) that the
 * leading-pane wrapper reads via `flex-basis`, which avoids re-renders on
 * every pointer move.
 *
 * The divider responds to keyboard arrows for accessibility and persists the
 * resulting ratio to `localStorage` under `storageKey`.  Below the configured
 * breakpoint the panes simply stack vertically and the divider hides.
 */
export function SplitPane({
  start,
  end,
  storageKey,
  defaultStartRatio = DEFAULT_RATIO,
  minStartRatio = 0.3,
  maxStartRatio = 0.75,
  breakpoint = "lg",
  className,
  startClassName,
  endClassName,
}: SplitPaneProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const startPaneRef = React.useRef<HTMLDivElement | null>(null);
  const ratioRef = React.useRef<number>(defaultStartRatio);
  const [ratio, setRatio] = React.useState<number>(defaultStartRatio);
  const [dragging, setDragging] = React.useState(false);

  // Hydrate stored ratio after mount to avoid SSR mismatch.
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return;
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) {
        const clamped = clamp(parsed, minStartRatio, maxStartRatio);
        ratioRef.current = clamped;
        setRatio(clamped);
      }
    } catch {
      // localStorage may be disabled; fall back to default ratio.
    }
  }, [storageKey, minStartRatio, maxStartRatio]);

  function persist(next: number) {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, next.toFixed(4));
    } catch {
      // ignore storage errors
    }
  }

  function applyRatio(next: number, opts?: { persist?: boolean }) {
    const clamped = clamp(next, minStartRatio, maxStartRatio);
    ratioRef.current = clamped;
    const startEl = startPaneRef.current;
    if (startEl) {
      startEl.style.flexBasis = `${clamped * 100}%`;
    }
    if (opts?.persist) persist(clamped);
  }

  function ratioFromPointer(clientX: number): number {
    const container = containerRef.current;
    if (!container) return ratioRef.current;
    const rect = container.getBoundingClientRect();
    const isRtl = window.getComputedStyle(container).direction === "rtl";
    const offset = isRtl ? rect.right - clientX : clientX - rect.left;
    return offset / rect.width;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    setDragging(true);
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    applyRatio(ratioFromPointer(event.clientX));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    // Push a state update so the React tree reflects the final ratio,
    // and persist the result to localStorage.
    setRatio(ratioRef.current);
    persist(ratioRef.current);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const isRtl =
      typeof window !== "undefined" && containerRef.current
        ? window.getComputedStyle(containerRef.current).direction === "rtl"
        : false;
    let delta = 0;
    if (event.key === "ArrowLeft") delta = isRtl ? +KEYBOARD_STEP : -KEYBOARD_STEP;
    else if (event.key === "ArrowRight") delta = isRtl ? -KEYBOARD_STEP : +KEYBOARD_STEP;
    else if (event.key === "Home") {
      event.preventDefault();
      applyRatio(minStartRatio, { persist: true });
      setRatio(minStartRatio);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      applyRatio(maxStartRatio, { persist: true });
      setRatio(maxStartRatio);
      return;
    } else {
      return;
    }
    event.preventDefault();
    const next = clamp(ratioRef.current + delta, minStartRatio, maxStartRatio);
    applyRatio(next, { persist: true });
    setRatio(next);
  }

  // Tailwind needs the breakpoint prefix to be a literal; keep a small map.
  const splitClasses =
    breakpoint === "md"
      ? "md:flex-row md:gap-0"
      : breakpoint === "xl"
        ? "xl:flex-row xl:gap-0"
        : "lg:flex-row lg:gap-0";

  const startSplitClasses =
    breakpoint === "md"
      ? "md:flex-[0_0_var(--start-basis)] md:min-w-0"
      : breakpoint === "xl"
        ? "xl:flex-[0_0_var(--start-basis)] xl:min-w-0"
        : "lg:flex-[0_0_var(--start-basis)] lg:min-w-0";

  const endSplitClasses =
    breakpoint === "md"
      ? "md:flex-1 md:min-w-0"
      : breakpoint === "xl"
        ? "xl:flex-1 xl:min-w-0"
        : "lg:flex-1 lg:min-w-0";

  const dividerVisibility =
    breakpoint === "md"
      ? "hidden md:flex"
      : breakpoint === "xl"
        ? "hidden xl:flex"
        : "hidden lg:flex";

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col gap-4", splitClasses, className)}
      style={{ "--start-basis": `${ratio * 100}%` } as React.CSSProperties}
    >
      <div ref={startPaneRef} className={cn(startSplitClasses, startClassName)}>
        {start}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={Math.round(minStartRatio * 100)}
        aria-valuemax={Math.round(maxStartRatio * 100)}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label="حجم لوحة التحرير"
        tabIndex={0}
        data-dragging={dragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative items-center justify-center self-stretch",
          "w-2 cursor-col-resize select-none touch-none",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          dividerVisibility,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors",
            "group-hover:bg-accent group-data-[dragging]:bg-accent",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "relative z-10 flex h-12 w-3 items-center justify-center rounded-full border border-border bg-background shadow-soft",
            "transition-colors group-hover:border-accent group-data-[dragging]:border-accent",
          )}
        >
          <GripVertical className="size-3 text-muted-foreground" />
        </span>
      </div>
      <div className={cn(endSplitClasses, endClassName)}>{end}</div>
    </div>
  );
}
