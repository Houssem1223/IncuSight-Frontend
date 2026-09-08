"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import { getAdminActivity, type ActivityItem, type DashboardFilters } from "@/src/lib/dashboard-api";
import { getActivityDotClassName } from "./activityTypeStyles";

type RecentActivityCardProps = {
  filters: DashboardFilters;
};

const ACTIVITY_PREVIEW_LIMIT = 5;

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) {
    return "A l'instant";
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
}

function getActivityHref(item: ActivityItem): string | null {
  if (item.applicationId) {
    return `/dashboard/admin/applications?search=${encodeURIComponent(item.applicationId)}`;
  }

  return null;
}

export default function RecentActivityCard({ filters }: RecentActivityCardProps) {
  const { darkMode } = useDashboardTheme();
  const query = useQuery({
    queryKey: ["dashboard", "admin", "activity", filters],
    queryFn: () => getAdminActivity(filters),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const cardShell = `shadow-sm transition-colors duration-300 ${
    darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
  }`;
  const mutedText = darkMode ? "text-slate-400" : "text-slate-500";
  const baseRowClassName = `flex items-start gap-3 rounded-xl border p-3 transition-all ${
    darkMode ? "border-slate-700 bg-slate-700/50" : "border-slate-100 bg-slate-50"
  }`;
  const hoverRowClassName = darkMode
    ? "hover:border-slate-600 hover:bg-slate-700"
    : "hover:border-slate-200 hover:bg-white";

  if (query.isPending) {
    return (
      <div className={`h-80 animate-pulse rounded-2xl ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
    );
  }

  if (query.isError) {
    return (
      <Card className={cardShell}>
        <CardContent className="p-6">
          <p className="text-sm text-red-700">Impossible de charger l&apos;activite recente.</p>
          <Button className="mt-3" onClick={() => query.refetch()} type="button" variant="outline">
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { activites } = query.data;
  const visibleActivites = activites.slice(0, ACTIVITY_PREVIEW_LIMIT);

  return (
    <Card className={cardShell}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
            <Activity className="h-5 w-5 text-purple-500" />
            Activite recente
          </CardTitle>
          <Link
            className="text-xs font-medium text-orange-500 hover:text-orange-400"
            href="/dashboard/admin/notifications"
          >
            Voir tout
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activites.length === 0 && (
          <p className="text-sm text-foreground-muted">Aucune activite recente.</p>
        )}

        <div className="space-y-3">
          {visibleActivites.map((item) => {
            const href = getActivityHref(item);
            const rowClassName = href ? `${baseRowClassName} ${hoverRowClassName}` : baseRowClassName;

            const content = (
              <>
                <div className={`mt-0.5 h-2 w-2 rounded-full ${getActivityDotClassName(item.type)}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {item.title}
                  </p>
                  <p className={`text-xs ${mutedText}`}>{item.message}</p>
                </div>
                <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  {formatRelativeTime(item.createdAt)}
                </span>
              </>
            );

            if (href) {
              return (
                <Link className={rowClassName} href={href} key={item.id}>
                  {content}
                </Link>
              );
            }

            return (
              <div className={rowClassName} key={item.id}>
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
