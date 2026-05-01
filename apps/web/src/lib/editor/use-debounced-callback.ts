"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a stable function that defers `fn` until `delayMs` of inactivity
 * have passed. Subsequent calls reset the timer. Useful for autosave.
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delayMs: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delayMs);
  };
}
