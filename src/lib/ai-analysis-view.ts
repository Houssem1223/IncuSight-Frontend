import { ApiError } from "./api";
import type {
  AiEvaluationSummary,
  AnalysisCriterion,
  ApplicationAiAnalysis,
  CriterionDivergence,
  DivergenceSeverity,
  ReadyAiAnalysis,
} from "@/src/types/ai-analysis";

/**
 * Règles d'affichage de l'analyse IA, extraites du composant pour être testables.
 *
 * Les libellés, sections de synthèse, critères à détailler et traductions
 * d'erreurs restent séparés du rendu pour être testés indépendamment de React.
 * Le loader accepte aussi les `.tsx` pour les tests du rendu serveur de la carte.
 *
 * Aucune statistique n'est calculée ici : moyennes, écarts-types et sévérités
 * viennent du backend et ne sont que mis en forme.
 */

// --- Libellés ---------------------------------------------------------------

/** Les clés sont celles du backend ; les libellés, ceux de la grille FR. */
const CRITERION_LABELS: Record<AnalysisCriterion, string> = {
  innovation: "Innovation",
  market: "Marché",
  team: "Équipe",
  feasibility: "Faisabilité",
  fit: "Adéquation",
};

/**
 * Mapping sémantique imposé : la sévérité doit toujours être lisible en toutes
 * lettres, jamais portée par la seule couleur (accessibilité).
 */
const SEVERITY_LABELS: Record<DivergenceSeverity, string> = {
  LOW: "Faible divergence",
  MEDIUM: "Divergence modérée",
  HIGH: "Forte divergence",
};

/**
 * Ton visuel, pas une couleur : le composant traduit ces tons en classes.
 * Garder les couleurs hors de ce module évite de tester du Tailwind.
 */
const SEVERITY_TONES: Record<DivergenceSeverity, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export type SeverityTone = (typeof SEVERITY_TONES)[DivergenceSeverity];

/** Un critère inconnu (backend en avance sur le frontend) reste affichable. */
export function getCriterionLabel(criterion: string): string {
  return CRITERION_LABELS[criterion as AnalysisCriterion] ?? criterion;
}

export function getSeverityLabel(severity: DivergenceSeverity): string {
  return SEVERITY_LABELS[severity];
}

export function getSeverityTone(severity: DivergenceSeverity): SeverityTone {
  return SEVERITY_TONES[severity];
}

// --- Textes fixes -----------------------------------------------------------

export const ADVISORY_BADGE_LABEL = "Aide à la décision";

export const ADVISORY_INTRO =
  "L’analyse IA synthétise les avis des évaluateurs. La décision finale reste humaine.";

export const ADVISORY_NOTICE =
  "Cette analyse constitue une aide à la lecture et ne remplace pas la décision de l’équipe MEDIANET.";

export const NOT_GENERATED_MESSAGE = "Aucune analyse IA n’a encore été générée.";

export const NO_SUBMITTED_EVALUATIONS_MESSAGE =
  "L’analyse IA sera disponible lorsqu’au moins une évaluation aura été soumise.";

export const INSUFFICIENT_EVALUATIONS_MESSAGE =
  "La détection des divergences nécessite au moins deux évaluations soumises.";

export const NO_SIGNIFICANT_DIVERGENCE_MESSAGE =
  "Les évaluateurs convergent sur l’ensemble des critères.";

export const GENERATION_IN_PROGRESS_MESSAGE = "Analyse des évaluations en cours…";

export const AI_UNAVAILABLE_MESSAGE =
  "L’analyse intelligente est temporairement indisponible. Les évaluations restent accessibles normalement.";

// --- État de la section -----------------------------------------------------

/**
 * `submittedEvaluations` vient de la synthèse d'évaluations déjà chargée par
 * l'écran. `null` = information pas encore disponible : on laisse alors le
 * backend trancher plutôt que de désactiver l'action à tort.
 */
export function canGenerateAnalysis(submittedEvaluations: number | null): boolean {
  return submittedEvaluations === null || submittedEvaluations > 0;
}

export function isReadyAnalysis(
  analysis: ApplicationAiAnalysis | undefined,
): analysis is ReadyAiAnalysis {
  return analysis?.status === "READY";
}

/**
 * Libellé de l'action principale. Une analyse périmée (`STALE`) se réactualise :
 * il y a bien déjà un résultat en base, il ne porte plus sur les avis actuels.
 */
export function getPrimaryActionLabel(analysis: ApplicationAiAnalysis | undefined): string | null {
  if (isReadyAnalysis(analysis)) {
    return null;
  }

  if (analysis?.status === "STALE") {
    return "Actualiser l’analyse";
  }

  return "Générer l’analyse";
}

/** Message d'attente, `null` si rien n'est en cours. */
export function getBusyMessage(options: {
  isLoading: boolean;
  isGenerating: boolean;
}): string | null {
  if (options.isGenerating) {
    return GENERATION_IN_PROGRESS_MESSAGE;
  }

  if (options.isLoading) {
    return "Chargement de l’analyse…";
  }

  return null;
}

// --- Synthèse ---------------------------------------------------------------

export type SummarySection = {
  key: "strengths" | "weaknesses" | "clarify";
  title: string;
  /** Marqueur textuel de liste, déjà porteur de sens sans la couleur. */
  marker: string;
  items: string[];
  emptyMessage: string;
};

/**
 * Les trois listes de la synthèse, dans l'ordre d'affichage. Une liste vide est
 * un résultat légitime (le modèle n'a rien retenu), pas une erreur : on l'annonce
 * au lieu de masquer la section, sinon l'admin ne sait pas si l'IA n'a rien
 * trouvé ou si l'affichage a échoué.
 */
export function getSummarySections(summary: AiEvaluationSummary): SummarySection[] {
  return [
    {
      key: "strengths",
      title: "Points forts",
      marker: "✓",
      items: summary.mainStrengths,
      emptyMessage: "Aucun point fort marquant n’a été retenu.",
    },
    {
      key: "weaknesses",
      title: "Points de vigilance",
      marker: "•",
      items: summary.mainWeaknesses,
      emptyMessage: "Aucun point de vigilance n’a été retenu.",
    },
    {
      key: "clarify",
      title: "Points à clarifier",
      marker: "?",
      items: summary.pointsToClarify,
      emptyMessage: "Aucun point à clarifier n’a été retenu.",
    },
  ];
}

// --- Divergences ------------------------------------------------------------

/** Seules MEDIUM et HIGH portent une explication : elles seules sont détaillées. */
export function needsDetailCard(divergence: CriterionDivergence): boolean {
  return divergence.severity !== "LOW";
}

const SEVERITY_ORDER: Record<DivergenceSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/**
 * Divergences à examiner, les plus fortes d'abord. À sévérité égale, la
 * divergence normalisée départage — c'est la mesure du backend, pas un recalcul.
 */
export function getDetailedDivergences(
  divergences: CriterionDivergence[],
): CriterionDivergence[] {
  return divergences
    .filter(needsDetailCard)
    .slice()
    .sort((left, right) => {
      const bySeverity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];

      return bySeverity !== 0
        ? bySeverity
        : right.normalizedDivergence - left.normalizedDivergence;
    });
}

/**
 * Message à afficher à la place (ou au-dessus) du tableau de consensus.
 * `null` quand les divergences sont exploitables telles quelles.
 */
export function getDivergenceNotice(analysis: ReadyAiAnalysis): string | null {
  if (analysis.meta.divergenceStatus === "INSUFFICIENT_EVALUATIONS") {
    return INSUFFICIENT_EVALUATIONS_MESSAGE;
  }

  if (analysis.meta.divergenceStatus === "NO_SIGNIFICANT_DIVERGENCE") {
    return NO_SIGNIFICANT_DIVERGENCE_MESSAGE;
  }

  return null;
}

/** "3,5 / 5" — l'échelle du backend est 1-5, jamais 0-10. */
export function formatMean(mean: number): string {
  return `${mean.toFixed(1).replace(".", ",")} / 5`;
}

/** Plage observée, affichée en toutes lettres plutôt qu'en "8 / 7 / 3". */
export function formatScoreRange(divergence: CriterionDivergence): string {
  return `Min ${divergence.min} · Max ${divergence.max}`;
}

// --- Horodatage -------------------------------------------------------------

export function formatGeneratedAt(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// --- Erreurs ----------------------------------------------------------------

/**
 * Messages métier par code d'erreur du module `ai`.
 *
 * Le backend renvoie déjà des messages français, mais ils décrivent parfois la
 * cause technique (un fournisseur a refusé la requête, configuration invalide) :
 * ces détails ne regardent pas l'admin fonctionnel, qui a seulement besoin de
 * savoir si l'analyse est réessayable. Aucune trace, aucun nom de fournisseur,
 * aucun statut amont n'est exposé.
 */
const ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  AI_NO_SUBMITTED_EVALUATIONS: NO_SUBMITTED_EVALUATIONS_MESSAGE,
  AI_INPUT_CHANGED:
    "Les évaluations ont changé pendant l’analyse. Relancez la génération.",
  AI_INPUT_TOO_LARGE:
    "Les évaluations sont trop volumineuses pour être analysées automatiquement.",
  AI_INVALID_SUBMITTED_SCORES:
    "Une évaluation soumise contient des notes incomplètes : l’analyse ne peut pas être calculée.",
  AI_PROVIDER_REQUEST_FAILED: AI_UNAVAILABLE_MESSAGE,
  AI_UNAVAILABLE: AI_UNAVAILABLE_MESSAGE,
  AI_CONFIGURATION_ERROR: AI_UNAVAILABLE_MESSAGE,
  AI_RATE_LIMITED:
    "L’analyse intelligente est momentanément saturée. Réessayez dans quelques minutes.",
};

function readErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const code = (data as Record<string, unknown>).code;

  return typeof code === "string" ? code : null;
}

/**
 * Traduit une erreur d'appel en message affichable. Ne renvoie jamais le corps
 * brut d'une réponse provider ni une stack.
 */
export function getAiAnalysisErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return AI_UNAVAILABLE_MESSAGE;
  }

  const byCode = ERROR_MESSAGES_BY_CODE[readErrorCode(error.data) ?? ""];

  if (byCode) {
    return byCode;
  }

  if (error.status === 403) {
    return "Seul un administrateur peut consulter l’analyse IA.";
  }

  if (error.status === 404) {
    return "Cette candidature est introuvable.";
  }

  // Panne réseau (`status` 0) ou erreur serveur sans code métier : l'utilisateur
  // n'a besoin de savoir qu'une chose, c'est que le reste de l'écran est intact.
  return AI_UNAVAILABLE_MESSAGE;
}
