"use client";

import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Clock, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { usePrefersReducedMotion } from "@/src/hooks/usePrefersReducedMotion";
import {
  getAdminOverview,
  type DashboardFilters,
  type PeriodComparison,
} from "@/src/lib/dashboard-api";

type OverviewKpiCardsProps = {
  filters: DashboardFilters;
};

/**
 * Anime une progression 0->1 une seule fois, au premier chargement reussi.
 * Tous les setState passent par le callback du timer (jamais directement dans
 * le corps de l'effet) — y compris le cas "skip" (deja anime / reduced motion),
 * qui utilise un timer a duree ~0 plutot qu'un setState synchrone.
 */
function useEntryProgress(dataReady: boolean): number {
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasAnimatedRef = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!dataReady) {
      return;
    }

    const skip = hasAnimatedRef.current || prefersReducedMotion;
    hasAnimatedRef.current = true;

    const steps = skip ? 1 : 60;
    const interval = skip ? 0 : 1500 / steps;
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      const linear = step / steps;
      setProgress(skip ? 1 : 1 - Math.pow(1 - linear, 3));

      if (step >= steps) {
        window.clearInterval(timer);
        setProgress(1);
      }
    }, interval);

    return () => window.clearInterval(timer);
  }, [dataReady, prefersReducedMotion]);

  return dataReady ? progress : 0;
}

function formatDeltaPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function DeltaIndicator({
  comparison,
  inverted = false,
}: {
  comparison: PeriodComparison;
  inverted?: boolean;
}) {
  if (!comparison.deltaComparable) {
    return <span className="text-xs text-foreground-muted">Non comparable</span>;
  }

  const isPositive = comparison.deltaPercent > 0;
  const isNegative = comparison.deltaPercent < 0;
  const isGood = inverted ? isNegative : isPositive;
  const isBad = inverted ? isPositive : isNegative;
  const colorClass = isGood ? "text-emerald-500" : isBad ? "text-red-500" : "text-foreground-muted";
  const Icon = comparison.deltaPercent >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className={`mt-2 flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-semibold">{formatDeltaPercent(comparison.deltaPercent)}</span>
      <span className="text-xs text-foreground-muted">vs periode precedente</span>
    </div>
  );
}

export default function OverviewKpiCards({ filters }: OverviewKpiCardsProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "overview", filters],
    queryFn: () => getAdminOverview(filters),
    placeholderData: keepPreviousData,
  });

  const entryProgress = useEntryProgress(query.isSuccess);

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  if (query.isPending) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>Impossible de charger les indicateurs.</p>
        <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
          Reessayer
        </Button>
      </div>
    );
  }

  const { candidatures, evaluations } = query.data;
  const applicationsValue = Math.round(candidatures.total.current * entryProgress);
  const acceptedValue = Math.round(candidatures.acceptees.current * entryProgress);
  const conversionValue = Math.round(candidatures.tauxAcceptation.current * entryProgress * 10) / 10;
  const delayValue = Math.round(evaluations.delaiMoyenJours.current * entryProgress * 10) / 10;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className={cardShell}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                Applications
              </p>
              <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                {applicationsValue}
              </p>
              <DeltaIndicator comparison={candidatures.total} />
            </div>
            <div className={`rounded-xl p-3 ${darkMode ? "bg-blue-500/20" : "bg-blue-100"}`}>
              <FileText className={`h-6 w-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                Startups acceptees
              </p>
              <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                {acceptedValue}
              </p>
              <div className="mt-2 flex items-center gap-1 text-orange-500">
                <span className="text-sm font-semibold">{conversionValue}%</span>
                <span className={`text-xs ${mutedText}`}>taux conversion</span>
              </div>
            </div>
            <div className={`rounded-xl p-3 ${darkMode ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
              <Building2 className={`h-6 w-6 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
                Delai moyen review
              </p>
              <p className={`mt-2 text-4xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                {delayValue}
                <span className={`text-xl ${darkMode ? "text-slate-500" : "text-slate-400"}`}>j</span>
              </p>
              <DeltaIndicator comparison={evaluations.delaiMoyenJours} inverted />
            </div>
            <div className={`rounded-xl p-3 ${darkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
              <Clock className={`h-6 w-6 ${darkMode ? "text-amber-400" : "text-amber-600"}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
