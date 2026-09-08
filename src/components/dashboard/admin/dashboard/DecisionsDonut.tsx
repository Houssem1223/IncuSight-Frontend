"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { getAdminDecisions, type DashboardFilters } from "@/src/lib/dashboard-api";

type DecisionsDonutProps = {
  filters: DashboardFilters;
};

const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

type Segment = {
  key: string;
  label: string;
  value: number;
  colorClassName: string;
  dotClassName: string;
};

export default function DecisionsDonut({ filters }: DecisionsDonutProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "decisions", filters],
    queryFn: () => getAdminDecisions(filters),
    placeholderData: keepPreviousData,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  if (query.isPending) {
    return (
      <div className={`h-64 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger les decisions.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { decisions } = query.data;
  const segments: Segment[] = [
    {
      key: "enAttente",
      label: "En attente",
      value: decisions.enAttente,
      colorClassName: "text-amber-500",
      dotClassName: "bg-amber-500",
    },
    {
      key: "acceptees",
      label: "Acceptees",
      value: decisions.acceptees,
      colorClassName: "text-emerald-500",
      dotClassName: "bg-emerald-500",
    },
    {
      key: "rejetees",
      label: "Rejetees",
      value: decisions.rejetees,
      colorClassName: "text-red-500",
      dotClassName: "bg-red-500",
    },
  ];

  let cumulative = 0;
  const donutSegments = segments.map((segment) => {
    const fraction = decisions.total > 0 ? segment.value / decisions.total : 0;
    const dash = fraction * DONUT_CIRCUMFERENCE;
    const offset = cumulative;
    cumulative += dash;

    return (
      <circle
        className={segment.colorClassName}
        cx="50"
        cy="50"
        fill="none"
        key={segment.key}
        r={DONUT_RADIUS}
        stroke="currentColor"
        strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE - dash}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        strokeWidth="12"
      />
    );
  });

  return (
    <Card className={cardShell}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
          <Users className="h-5 w-5 text-blue-500" />
          Decisions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="relative h-40 w-40">
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                fill="none"
                r={DONUT_RADIUS}
                stroke={darkMode ? "#334155" : "#f1f5f9"}
                strokeWidth="12"
              />
              {donutSegments}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                {decisions.total}
              </span>
              <span className={`text-xs ${mutedText}`}>decisions</span>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            {segments.map((segment) => (
              <div className="flex items-center justify-between" key={segment.key}>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${segment.dotClassName}`} />
                  <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {segment.label}
                  </span>
                </div>
                <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {segment.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
