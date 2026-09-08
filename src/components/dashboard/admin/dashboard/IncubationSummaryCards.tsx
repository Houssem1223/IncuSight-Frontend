"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { getAdminIncubation, type DashboardFilters } from "@/src/lib/dashboard-api";

type IncubationSummaryCardsProps = {
  filters: DashboardFilters;
};

export default function IncubationSummaryCards({ filters }: IncubationSummaryCardsProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "incubation", filters],
    queryFn: () => getAdminIncubation(filters),
    placeholderData: keepPreviousData,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;

  if (query.isPending) {
    return (
      <div className={`h-64 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger le suivi incubation.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { incubation } = query.data;
  const objectivesTotal =
    incubation.objectifs.todo +
    incubation.objectifs.inProgress +
    incubation.objectifs.done +
    incubation.objectifs.blocked;

  return (
    <Card className={cardShell}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Suivi incubation
          </CardTitle>
          <Link
            className="text-xs font-medium text-orange-500 hover:text-orange-400"
            href="/dashboard/admin/incubation-followups"
          >
            Voir le suivi incubation
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-xl border p-4 ${darkMode ? "border-emerald-500/30 bg-emerald-500/10" : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"}`}
          >
            <p className={`text-xs font-semibold uppercase ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
              Startups en incubation
            </p>
            <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
              {incubation.startupsActuellementIncubees}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${darkMode ? "border-blue-500/30 bg-blue-500/10" : "border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50"}`}
          >
            <p className={`text-xs font-semibold uppercase ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
              Progression moyenne
            </p>
            <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-blue-400" : "text-blue-700"}`}>
              {incubation.progressionMoyenne}%
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${darkMode ? "border-orange-500/30 bg-orange-500/10" : "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50"}`}
          >
            <p className={`text-xs font-semibold uppercase ${darkMode ? "text-orange-400" : "text-orange-600"}`}>
              Objectifs bloques
            </p>
            <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-orange-400" : "text-orange-700"}`}>
              {incubation.objectifs.blocked}
              <span className="text-base font-medium text-orange-500"> / {objectivesTotal}</span>
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${darkMode ? "border-purple-500/30 bg-purple-500/10" : "border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50"}`}
          >
            <p className={`text-xs font-semibold uppercase ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
              Startups en retard
            </p>
            <p className={`mt-1 text-3xl font-bold ${darkMode ? "text-purple-400" : "text-purple-700"}`}>
              {incubation.startupsEnRetard}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
