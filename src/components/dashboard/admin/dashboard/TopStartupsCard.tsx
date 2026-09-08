"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { getAdminTopStartups, type DashboardFilters } from "@/src/lib/dashboard-api";

type TopStartupsCardProps = {
  filters: DashboardFilters;
};

const rankBadgeClassName = (index: number, darkMode: boolean): string => {
  if (index === 0) {
    return "bg-gradient-to-br from-amber-400 to-orange-500 text-white";
  }

  if (index === 1) {
    return "bg-gradient-to-br from-slate-300 to-slate-400 text-white";
  }

  if (index === 2) {
    return "bg-gradient-to-br from-amber-600 to-amber-700 text-white";
  }

  return darkMode ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-600";
};

export default function TopStartupsCard({ filters }: TopStartupsCardProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "top-startups", filters],
    queryFn: () => getAdminTopStartups(filters),
    placeholderData: keepPreviousData,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

  if (query.isPending) {
    return (
      <div className={`h-80 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger le classement.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { classement } = query.data;

  return (
    <Card className={cardShell}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            <Award className="h-5 w-5 text-amber-500" />
            Top Startups
          </CardTitle>
          <Link
            className="text-xs font-medium text-orange-500 hover:text-orange-400"
            href="/dashboard/admin/startups"
          >
            Voir tout
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {classement.length === 0 && (
          <p className="text-sm text-foreground-muted">Aucune startup active sur cette periode.</p>
        )}

        <div className="space-y-3">
          {classement.map((startup, idx) => (
            <div
              className={`flex items-center gap-4 rounded-xl border p-3 ${
                darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-100 bg-slate-50"
              }`}
              key={startup.startupId}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${rankBadgeClassName(idx, darkMode)}`}
              >
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {startup.startupName}
                </p>
                <p className={`text-xs ${mutedText}`}>{startup.sector ?? "—"}</p>
              </div>
              <p className={`text-lg font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
                {startup.score}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
