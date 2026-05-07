"use client";

import * as React from "react";

/**
 * Render any child as a thumbnail that fills its wrapper width.  The child
 * is assumed to render at A4 page size (210mm ≈ 793.7px wide).  We measure
 * the wrapper via ResizeObserver and apply a transform scale equal to
 * `wrapperWidth / A4_WIDTH_PX`, so the child's full width always maps to
 * the wrapper's full width — no gray bands on the side, no clipping.
 *
 * The wrapper exposes a controllable aspect ratio (defaults to A4 portrait,
 * 210/297) so the card box matches the visible page exactly.
 */
const A4_WIDTH_PX = 793.7007874;

export interface TemplateThumbnailProps {
  children: React.ReactNode;
  /** Aspect ratio override (e.g. "210/297" for A4). */
  aspectRatio?: string;
  className?: string;
}

export function TemplateThumbnail({
  children,
  aspectRatio = "210/297",
  className,
}: TemplateThumbnailProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0.2);

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(w / A4_WIDTH_PX);
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          width: `${A4_WIDTH_PX}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          insetInlineStart: 0,
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
