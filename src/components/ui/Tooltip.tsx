"use client";

import { cloneElement, useId, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

/** Portal keeps rail labels visible outside the navigation's scroll container. */
export default function Tooltip({ label, enabled = true, children }: {
  label: string; enabled?: boolean; children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  return <div className="app-tooltip-trigger"
    onMouseEnter={(event) => {
      if (!enabled) return;
      const box = event.currentTarget.getBoundingClientRect();
      setPosition({ top: Math.min(box.top + box.height / 2, window.innerHeight - 28), left: box.right + 10 });
    }}
    onFocus={(event) => {
      if (!enabled) return;
      const box = event.currentTarget.getBoundingClientRect();
      setPosition({ top: Math.min(box.top + box.height / 2, window.innerHeight - 28), left: box.right + 10 });
    }}
    onMouseLeave={() => setPosition(null)} onBlur={() => setPosition(null)}
    onKeyDown={(event) => { if (event.key === "Escape") setPosition(null); }}>
    {cloneElement(children, { "aria-describedby": enabled && position ? id : undefined })}
    {enabled && position && createPortal(<div id={id} role="tooltip" className="app-tooltip" style={position}>{label}</div>, document.body)}
  </div>;
}
