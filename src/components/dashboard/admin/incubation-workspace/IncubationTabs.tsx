"use client";

import { Activity, LayoutDashboard, Shield, StickyNote, Target } from "lucide-react";
import { useRef } from "react";
import { incubationTabs, type IncubationTab } from "@/src/hooks/useIncubationTab";

const icons = { overview: LayoutDashboard, objectives: Target, journal: Activity, vigilance: Shield, notes: StickyNote };

export default function IncubationTabs({ tab, onChange, objectives, updates }: {
  tab: IncubationTab; onChange: (tab: IncubationTab) => void; objectives: number; updates: number;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="inc-tabs" role="tablist" aria-label="Sections du suivi">
    {incubationTabs.map(([key, label], index) => <button key={key} type="button"
      ref={(node) => { buttons.current[index] = node; }}
      role="tab" id={`inc-tab-${key}`} aria-selected={tab === key}
      aria-controls={`inc-panel-${key}`} tabIndex={tab === key ? 0 : -1}
      onClick={() => onChange(key)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % 5
          : event.key === "ArrowLeft" ? (index + 4) % 5
            : event.key === "Home" ? 0 : event.key === "End" ? 4 : null;
        if (next === null) return;
        event.preventDefault(); buttons.current[next]?.focus(); onChange(incubationTabs[next][0]);
      }}>
      {(() => { const Icon = icons[key]; return <Icon size={16} aria-hidden="true" />; })()}{label}{key === "objectives" && <span>{objectives}</span>}{key === "journal" && <span>{updates}</span>}
    </button>)}
  </div>;
}
