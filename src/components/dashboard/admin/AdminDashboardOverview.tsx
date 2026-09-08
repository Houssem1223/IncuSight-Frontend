"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import { useDashboardFilters } from "@/src/hooks/useDashboardFilters";
import DashboardFilterBar from "./dashboard/DashboardFilterBar";
import DecisionsDonut from "./dashboard/DecisionsDonut";
import IncubationSummaryCards from "./dashboard/IncubationSummaryCards";
import InsightsCard from "./dashboard/InsightsCard";
import OverviewKpiCards from "./dashboard/OverviewKpiCards";
import PipelineCard from "./dashboard/PipelineCard";
import QuickActionsBar from "./dashboard/QuickActionsBar";
import RecentActivityCard from "./dashboard/RecentActivityCard";
import TimeseriesCard from "./dashboard/TimeseriesCard";
import TopStartupsCard from "./dashboard/TopStartupsCard";

export default function AdminDashboardOverview() {
  const dashboardFilters = useDashboardFilters();

  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="space-y-8">
        <DashboardFilterBar {...dashboardFilters} />

        {/* scroll-mt compense le header sticky quand le bouton "Actions rapides" du Header saute ici. */}
        <div className="scroll-mt-24" id="quick-actions">
          <QuickActionsBar filters={dashboardFilters.filters} />
        </div>

        <OverviewKpiCards filters={dashboardFilters.filters} />

        <TimeseriesCard filters={dashboardFilters.filters} />

        <div className="grid grid-cols-3 gap-6">
          <PipelineCard filters={dashboardFilters.filters} />

          <TopStartupsCard filters={dashboardFilters.filters} />

          <RecentActivityCard filters={dashboardFilters.filters} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <DecisionsDonut filters={dashboardFilters.filters} />

          <IncubationSummaryCards filters={dashboardFilters.filters} />
        </div>

        {/* scroll-mt compense le header sticky quand "Alertes" (QuickActionsBar) saute ici. */}
        <div className="scroll-mt-24" id="insights">
          <InsightsCard filters={dashboardFilters.filters} />
        </div>
      </div>
    </RoleGuard>
  );
}
