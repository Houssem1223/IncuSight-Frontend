"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export const SIDEBAR_PREFERENCE_KEY = "incusight-sidebar-collapsed";

// The first render matches the server. Only an explicit toggle writes storage.
export function useSidebarPreference() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const read = () => {
      try { setCollapsed(localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true"); }
      catch { /* Storage can be unavailable in private browsers. */ }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(next)); }
    catch { /* The current session remains usable without storage. */ }
  };
  return { collapsed, toggle };
}

const desktopQuery = "(min-width: 1280px)";
function subscribe(listener: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
export function useDesktopSidebar() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(desktopQuery).matches, () => true);
}
