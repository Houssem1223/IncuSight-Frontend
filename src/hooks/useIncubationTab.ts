"use client";

import { usePathname, useSearchParams } from "next/navigation";

export const incubationTabs = [
  ["overview", "Vue d’ensemble"], ["objectives", "Objectifs"],
  ["journal", "Journal"], ["vigilance", "Vigilance & IA"], ["notes", "Notes"],
] as const;
export type IncubationTab = (typeof incubationTabs)[number][0];
export function parseIncubationTab(value: string | null): IncubationTab {
  return incubationTabs.find(([key]) => key === value)?.[0] ?? "overview";
}

export function useIncubationTab() {
  const params = useSearchParams();
  const pathname = usePathname();
  const tab = parseIncubationTab(params.get("tab"));
  function selectTab(next: IncubationTab) {
    if (next === tab) return;
    const query = new URLSearchParams(params.toString());
    query.set("tab", next);
    // This is client presentation state. Next 16 integrates native history
    // with useSearchParams, without requesting another Server Component tree.
    window.history.pushState(null, "", `${pathname}?${query}`);
  }
  return { tab, selectTab };
}
