"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock, FolderKanban, UserCheck, type LucideIcon } from "lucide-react";
import { useDashboardTheme } from "@/src/contexts/DashboardThemeContext";
import {
  getAdminInsights,
  getAdminOverview,
  type DashboardFilters,
  type InsightSeverity,
} from "@/src/lib/dashboard-api";

type QuickActionsBarProps = {
  filters: DashboardFilters;
};

type QuickAction = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  gradientClassName: string;
  badgeCount: number | undefined;
  badgeColorClassName: string;
};

const ACTIONABLE_SEVERITIES = new Set<InsightSeverity>(["critical", "warning"]);

export default function QuickActionsBar({ filters }: QuickActionsBarProps) {
  const { darkMode } = useDashboardTheme();

  // Memes query keys que OverviewKpiCards et InsightsCard : TanStack Query
  // dedoublonne, zero requete reseau supplementaire pour ces badges.
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "admin", "overview", filters],
    queryFn: () => getAdminOverview(filters),
    placeholderData: keepPreviousData,
  });

  const insightsQuery = useQuery({
    queryKey: ["dashboard", "admin", "insights", filters],
    queryFn: () => getAdminInsights(filters),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });

  const actionableInsights = insightsQuery.data?.insights.filter((insight) =>
    ACTIONABLE_SEVERITIES.has(insight.severity),
  );
  const hasCriticalAlert = actionableInsights?.some((insight) => insight.severity === "critical") ?? false;

  const actions: QuickAction[] = [
    {
      key: "programs",
      label: "Creer programme",
      href: "/dashboard/admin/program",
      icon: FolderKanban,
      gradientClassName: "from-blue-500 to-cyan-500",
      badgeCount: undefined,
      badgeColorClassName: "",
    },
    {
      key: "evaluators",
      label: "Affecter evaluateur",
      href: "/dashboard/admin/application-evaluators",
      icon: UserCheck,
      gradientClassName: "from-purple-500 to-pink-500",
      badgeCount: undefined,
      badgeColorClassName: "",
    },
    {
      key: "late-evaluations",
      label: "Evaluations en retard",
      href: "/dashboard/admin/application-evaluations",
      icon: Clock,
      gradientClassName: "from-red-500 to-rose-500",
      badgeCount: overviewQuery.data?.evaluations.enRetard,
      badgeColorClassName: "bg-red-500",
    },
    {
      key: "alerts",
      label: "Alertes",
      href: "#insights",
      icon: AlertTriangle,
      gradientClassName: "from-amber-500 to-yellow-500",
      badgeCount: actionableInsights?.length,
      badgeColorClassName: hasCriticalAlert ? "bg-red-500" : "bg-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            className={`group relative flex items-center gap-4 rounded-2xl border p-5 transition-all duration-300 ${
              darkMode
                ? "border-slate-700 bg-slate-800 hover:border-slate-600"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            href={action.href}
            key={action.key}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradientClassName} shadow-lg transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <span className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              {action.label}
            </span>
            <ChevronRight
              className={`ml-auto h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 ${
                darkMode ? "text-slate-500" : "text-slate-300"
              }`}
            />
            {Boolean(action.badgeCount) && (
              <span
                className={`absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${action.badgeColorClassName}`}
              >
                {action.badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
