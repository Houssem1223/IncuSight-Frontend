"use client";

import { Activity, CheckCircle2, ClipboardPlus, Target } from "lucide-react";

type SummaryCardsProps = {
  active: number;
  completed: number;
  objectives: number;
  completedObjectives: number;
};

export default function SummaryCards({
  active,
  completed,
  objectives,
  completedObjectives,
}: SummaryCardsProps) {
  const items = [
    { label: "Suivis actifs", value: active, icon: Activity },
    { label: "Suivis terminés", value: completed, icon: CheckCircle2 },
    { label: "Objectifs", value: objectives, icon: Target },
    { label: "Objectifs réalisés", value: completedObjectives, icon: ClipboardPlus },
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article className="dashboard-card p-4" key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
              </div>
              <span className="rounded-xl bg-orange-50 p-2.5 text-brand-strong">
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
