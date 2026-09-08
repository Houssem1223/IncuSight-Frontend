"use client";

import { useEffect, useRef } from "react";

type UseAutoRefreshOptions = {
  intervalMs: number;
  enabled?: boolean;
  refreshOnFocus?: boolean;
  refreshOnVisibility?: boolean;
};

export function useAutoRefresh(
  callback: () => void | Promise<unknown>,
  { intervalMs, enabled = true, refreshOnFocus = false, refreshOnVisibility = false }: UseAutoRefreshOptions,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const run = () => {
      void callbackRef.current();
    };

    const runIfVisible = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };

    run();

    const intervalId = window.setInterval(refreshOnVisibility ? runIfVisible : run, intervalMs);

    if (refreshOnFocus) {
      window.addEventListener("focus", runIfVisible);
    }

    if (refreshOnVisibility) {
      document.addEventListener("visibilitychange", runIfVisible);
    }

    return () => {
      window.clearInterval(intervalId);

      if (refreshOnFocus) {
        window.removeEventListener("focus", runIfVisible);
      }

      if (refreshOnVisibility) {
        document.removeEventListener("visibilitychange", runIfVisible);
      }
    };
  }, [enabled, intervalMs, refreshOnFocus, refreshOnVisibility]);
}
