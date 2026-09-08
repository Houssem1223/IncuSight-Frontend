"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import {
  getAdminInsights,
  type DashboardFilters,
  type Insight,
  type InsightSeverity,
} from "@/src/lib/dashboard-api";
import { resolveInsightHref } from "./insightActionLinks";

type InsightsCardProps = {
  filters: DashboardFilters;
};

const severityConfig: Record<
  InsightSeverity,
  { icon: typeof AlertTriangle; badgeClassName: string; iconClassName: string }
> = {
  critical: {
    icon: XCircle,
    badgeClassName: "border-red-200 bg-red-50 text-red-700",
    iconClassName: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    iconClassName: "text-amber-500",
  },
  info: {
    icon: Info,
    badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
    iconClassName: "text-blue-500",
  },
  positive: {
    icon: CheckCircle2,
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconClassName: "text-emerald-500",
  },
};

function InsightRow({ insight, darkMode }: { insight: Insight; darkMode: boolean }) {
  const config = severityConfig[insight.severity];
  const Icon = config.icon;
  const href = resolveInsightHref(insight);
  const hoverClassName = href
    ? darkMode
      ? "hover:border-slate-600 hover:bg-slate-700"
      : "hover:border-slate-200 hover:bg-white"
    : "";

  const body = (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
        darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-100 bg-slate-50"
      } ${hoverClassName}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconClassName}`} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
            {insight.title}
          </p>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.badgeClassName}`}>
            {insight.severity}
          </span>
        </div>
        <p className={`mt-1 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          {insight.description}
        </p>
        {typeof insight.metric === "number" && (
          <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            {insight.metric}
            {typeof insight.delta === "number" &&
              ` (${insight.delta > 0 ? "+" : ""}${insight.delta})`}
          </p>
        )}
      </div>
      {href && (
        <span className="whitespace-nowrap text-xs font-medium text-orange-500">
          {insight.actionLabel ?? "Voir"}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link className="block" href={href}>
        {body}
      </Link>
    );
  }

  return body;
}

export default function InsightsCard({ filters }: InsightsCardProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "insights", filters],
    queryFn: () => getAdminInsights(filters),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;

  if (query.isPending) {
    return (
      <div className={`h-48 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger les alertes.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { insights } = query.data;

  return (
    <Card className={cardShell}>
      <CardHeader>
        <CardTitle className={darkMode ? "text-white" : "text-slate-900"}>
          Alertes et recommandations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 && (
          <p className="text-sm text-foreground-muted">Aucune alerte actuellement.</p>
        )}

        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightRow darkMode={darkMode} insight={insight} key={insight.id} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
