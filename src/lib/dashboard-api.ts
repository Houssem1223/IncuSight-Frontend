import { apiFetch } from "./api";

// Types copiés verbatim depuis docs/dashboard-backend-api-contract.md — source de
// vérité. Si le backend change une forme de réponse, mets à jour ce fichier ET ce doc
// dans la même tâche.

export type DashboardPeriod = "7d" | "30d" | "3m" | "1y" | "custom";
export type DashboardStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type DashboardFilters = {
  programId?: string;
  period?: DashboardPeriod;
  from?: string;
  to?: string;
  status?: DashboardStatus;
};

export type PeriodComparison = {
  current: number;
  previous: number;
  /** Toujours 0 si deltaComparable=false, jamais NaN/Infinity. */
  deltaPercent: number;
  /** false si previous=0 : afficher "non comparable", jamais "+100%". */
  deltaComparable: boolean;
};

export type ResolvedPeriod = {
  currentFrom: string;
  currentTo: string;
  previousFrom: string;
  previousTo: string;
};

export type AdminOverviewResponse = {
  period: ResolvedPeriod;
  candidatures: {
    total: PeriodComparison;
    enAttente: number;
    enEvaluation: number;
    acceptees: PeriodComparison;
    rejetees: PeriodComparison;
    tauxAcceptation: PeriodComparison;
  };
  evaluations: {
    total: PeriodComparison;
    enAttente: number;
    terminees: PeriodComparison;
    delaiMoyenJours: PeriodComparison;
    /** Échelle 1-5, pas 0-100. */
    scoreMoyen: PeriodComparison;
    candidaturesEvaluationsCompletes: number;
    enRetard: number;
  };
};

export type PipelineStageLabel = "Candidatures" | "Évaluation" | "Sélection" | "Incubation";

export type PipelineStage = {
  stage: PipelineStageLabel;
  count: number;
};

export type AdminPipelineResponse = {
  period: ResolvedPeriod;
  stages: PipelineStage[];
};

export type TimeseriesPoint = {
  bucket: string;
  candidatures: number;
  acceptations: number;
  /** null = aucune évaluation soumise dans ce bucket. */
  delaiMoyenJours: number | null;
};

export type TimeseriesGranularity = "day" | "week" | "month";

export type AdminTimeseriesResponse = {
  period: ResolvedPeriod;
  granularity: TimeseriesGranularity;
  current: TimeseriesPoint[];
  previous: TimeseriesPoint[];
};

export type AdminDecisionsResponse = {
  period: ResolvedPeriod;
  decisions: {
    enAttente: number;
    acceptees: number;
    rejetees: number;
    total: number;
  };
};

export type IncubationPhase =
  | "ONBOARDING"
  | "DIAGNOSTIC"
  | "BUILD"
  | "MARKET_VALIDATION"
  | "PITCH_PREPARATION"
  | "CLOSING";

export type IncubationPhaseBreakdown = {
  phase: IncubationPhase;
  count: number;
};

export type AdminIncubationResponse = {
  /** Définit ici une cohorte (startDate dans la fenêtre), pas une comparaison. */
  period: ResolvedPeriod;
  incubation: {
    startupsActuellementIncubees: number;
    progressionMoyenne: number;
    objectifs: {
      todo: number;
      inProgress: number;
      done: number;
      blocked: number;
    };
    startupsSansUpdateRecent: number;
    startupsEnRetard: number;
    repartitionParPhase: IncubationPhaseBreakdown[];
  };
};

export type TopStartup = {
  startupId: string;
  startupName: string;
  sector: string | null;
  score: number;
  breakdown: {
    evaluationScoreNormalized: number;
    incubationProgress: number;
    objectivesCompletionRate: number;
    updateRegularityRate: number;
  };
};

export type AdminTopStartupsResponse = {
  totalStartupsActives: number;
  /** Limité à 10, trié par score décroissant. */
  classement: TopStartup[];
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  applicationId: string | null;
  programId: string | null;
  evaluationId: string | null;
  decisionId: string | null;
};

export type AdminActivityResponse = {
  /** Limité à 15, scopé à l'admin appelant. */
  activites: ActivityItem[];
};

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric: number | null;
  delta: number | null;
  actionLabel: string | null;
  actionUrl: string | null;
  entityIds: string[];
};

export type AdminInsightsResponse = {
  insights: Insight[];
};

export function buildDashboardQuery(filters: DashboardFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.programId !== undefined) {
    params.set("programId", filters.programId);
  }

  if (filters.period !== undefined) {
    params.set("period", filters.period);
  }

  if (filters.from !== undefined) {
    params.set("from", filters.from);
  }

  if (filters.to !== undefined) {
    params.set("to", filters.to);
  }

  if (filters.status !== undefined) {
    params.set("status", filters.status);
  }

  return params.toString();
}

function withQuery(path: string, filters: DashboardFilters): string {
  const query = buildDashboardQuery(filters);
  return query ? `${path}?${query}` : path;
}

export function getAdminOverview(filters: DashboardFilters = {}): Promise<AdminOverviewResponse> {
  return apiFetch<AdminOverviewResponse>(withQuery("dashboard/admin/overview", filters));
}

export function getAdminPipeline(filters: DashboardFilters = {}): Promise<AdminPipelineResponse> {
  return apiFetch<AdminPipelineResponse>(withQuery("dashboard/admin/pipeline", filters));
}

export function getAdminTimeseries(filters: DashboardFilters = {}): Promise<AdminTimeseriesResponse> {
  return apiFetch<AdminTimeseriesResponse>(withQuery("dashboard/admin/timeseries", filters));
}

export function getAdminDecisions(filters: DashboardFilters = {}): Promise<AdminDecisionsResponse> {
  return apiFetch<AdminDecisionsResponse>(withQuery("dashboard/admin/decisions", filters));
}

export function getAdminIncubation(filters: DashboardFilters = {}): Promise<AdminIncubationResponse> {
  return apiFetch<AdminIncubationResponse>(withQuery("dashboard/admin/incubation", filters));
}

export function getAdminTopStartups(filters: DashboardFilters = {}): Promise<AdminTopStartupsResponse> {
  return apiFetch<AdminTopStartupsResponse>(withQuery("dashboard/admin/top-startups", filters));
}

export function getAdminActivity(filters: DashboardFilters = {}): Promise<AdminActivityResponse> {
  return apiFetch<AdminActivityResponse>(withQuery("dashboard/admin/activity", filters));
}

export function getAdminInsights(filters: DashboardFilters = {}): Promise<AdminInsightsResponse> {
  return apiFetch<AdminInsightsResponse>(withQuery("dashboard/admin/insights", filters));
}
