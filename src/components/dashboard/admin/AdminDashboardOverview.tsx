"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import { useDashboardFilters } from "@/src/hooks/useDashboardFilters";
import { toVigilanceTopParams } from "@/src/lib/startup-vigilance-params";
import DashboardFilterBar from "./dashboard/DashboardFilterBar";
import DecisionsDonut from "./dashboard/DecisionsDonut";
import IncubationSummaryCards from "./dashboard/IncubationSummaryCards";
import InsightsCard from "./dashboard/InsightsCard";
import OverviewKpiCards from "./dashboard/OverviewKpiCards";
import PipelineCard from "./dashboard/PipelineCard";
import QuickActionsBar from "./dashboard/QuickActionsBar";
import RecentActivityCard from "./dashboard/RecentActivityCard";
import StartupVigilanceOverview from "./vigilance/StartupVigilanceOverview";
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

        {/* Ces grilles etaient en `grid-cols-3`/`grid-cols-2` sans prefixe de
            breakpoint : la mise en page ne se reorganisait jamais et debordait
            sous la largeur bureau. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <PipelineCard filters={dashboardFilters.filters} />

          <TopStartupsCard filters={dashboardFilters.filters} />

          <RecentActivityCard filters={dashboardFilters.filters} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DecisionsDonut filters={dashboardFilters.filters} />

          <IncubationSummaryCards filters={dashboardFilters.filters} />
        </div>

        {/* scroll-mt compense le header sticky quand "Alertes" (QuickActionsBar) saute ici. */}
        <div className="scroll-mt-24" id="insights">
          <InsightsCard filters={dashboardFilters.filters} />
        </div>

        {/* Apercu : les cinq suivis les plus en vigilance, page 1, tri
            decroissant, filtres globaux du dashboard compris.

            ⚠️ `status` du filtre global est volontairement laisse de cote :
            c'est un statut de *candidature* (PENDING/ACCEPTED/REJECTED), alors
            que la vigilance attend un statut d'*incubation*
            (ACTIVE/COMPLETED/...). Le transmettre serait un 400. La conversion
            est faite par `toVigilanceTopParams`, qui ne garde que ce que cette
            route accepte. Aucune analyse IA n'est declenchee d'ici. */}
        <StartupVigilanceOverview
          params={toVigilanceTopParams(dashboardFilters.filters)}
          variant="top"
        />
      </div>
    </RoleGuard>
  );
}
