"use client";

import { useEffect } from "react";

/**
 * Confirm-on-unload guard. Sets `beforeunload` while `dirty` is true so the
 * browser prompts the user if they try to close the tab with unsaved edits.
 * Routing-level guards are handled per-section via the ConfirmNavigation hook.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
