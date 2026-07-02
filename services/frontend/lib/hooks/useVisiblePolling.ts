"use client";

import { useEffect } from "react";

export function useVisiblePolling(callback: () => void, intervalMs = 30000, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const runIfVisible = () => {
      if (document.visibilityState === "visible") {
        callback();
      }
    };

    const interval = window.setInterval(runIfVisible, intervalMs);
    const handleVisibilityChange = () => runIfVisible();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback, enabled, intervalMs]);
}
