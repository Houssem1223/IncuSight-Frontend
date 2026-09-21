"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function IncubationWorkspace({ selected, children }: { selected: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector("[data-dashboard-header]");
    if (!header || typeof ResizeObserver === "undefined") return;
    const context = root.current?.querySelector(".inc-context");
    const observer = new ResizeObserver(() => {
      root.current?.style.setProperty("--inc-top", `${header.getBoundingClientRect().height}px`);
      if (context) root.current?.style.setProperty("--inc-context-height", `${context.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
    if (context) observer.observe(context);
    return () => observer.disconnect();
  }, [selected]);
  return <div ref={root} className="inc-workspace" data-selected={selected}>{children}</div>;
}
