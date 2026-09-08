"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { getAdminOverview, getAdminPipeline, type DashboardFilters } from "@/src/lib/dashboard-api";
import { defaultPipelineStageLink, pipelineStageLinks } from "./pipelineStageLinks";

type PipelineCardProps = {
  filters: DashboardFilters;
};

export default function PipelineCard({ filters }: PipelineCardProps) {
  const { darkMode } = useDashboardTheme();

  const pipelineQuery = useQuery({
    queryKey: ["dashboard", "admin", "pipeline", filters],
    queryFn: () => getAdminPipeline(filters),
    placeholderData: keepPreviousData,
  });

  // Meme query key que OverviewKpiCards — TanStack Query dedoublonne, zero requete
  // reseau supplementaire pour le taux de conversion du footer.
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "admin", "overview", filters],
    queryFn: () => getAdminOverview(filters),
    placeholderData: keepPreviousData,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;

  if (pipelineQuery.isPending) {
    return (
      <div className={`h-80 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (pipelineQuery.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger le pipeline.</p>
          <Button
            className="mt-3"
            onClick={() => pipelineQuery.refetch()}
            type="button"
            variant="outline"
          >
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { stages } = pipelineQuery.data;
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const conversionRate = overviewQuery.data?.candidatures.tauxAcceptation.current;

  return (
    <Card className={cardShell}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stages.length === 0 && (
          <p className="text-sm text-foreground-muted">
            Aucune donnee de pipeline sur cette periode.
          </p>
        )}

        <div className="space-y-4">
          {stages.map((item) => {
            const link = pipelineStageLinks[item.stage] ?? defaultPipelineStageLink;
            const width = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <Link className="block rounded-lg transition hover:opacity-80" href={link.href} key={item.stage}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {item.stage}
                  </span>
                  <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {item.count}
                  </span>
                </div>
                <div className={`h-3 w-full overflow-hidden rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                  <div
                    className={`h-full ${link.barColorClassName} rounded-full transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {typeof conversionRate === "number" && (
          <div
            className={`mt-6 flex items-center justify-between rounded-xl p-4 ${
              darkMode
                ? "border border-orange-500/30 bg-orange-500/10"
                : "border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50"
            }`}
          >
            <span className={`text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Taux de conversion global
            </span>
            <span className="text-xl font-bold text-emerald-500">{conversionRate}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
