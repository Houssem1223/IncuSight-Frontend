import { ApiError } from "./api";
import { countActiveVigilanceFilters, type VigilanceListParamsState } from "./startup-vigilance-params";
import type {
  FollowUpObjective,
  FollowUpUpdate,
} from "@/src/types/incubation-followups";
import type {
  EvidenceSource,
  StartupVigilanceDetail,
  StartupVigilanceItem,
  StartupVigilanceListItem,
  StartupVigilancePagination,
  VigilanceAiSeverity,
  VigilanceAiStatus,
  VigilanceFactorKey,
  VigilanceFactors,
  VigilanceIssueCategory,
  VigilanceLevel,
  VigilancePeriod,
  VigilanceSort,
} from "@/src/types/startup-vigilance";

/**
 * Règles d'affichage de la vigilance, extraites des composants pour être testables
 * et pour ne pas répéter les mêmes `switch` d'un composant à l'autre.
 *
 * ⚠️ **Aucun score n'est calculé ici.** Le backend est seul juge : ce module
 * traduit, met en forme, trie et filtre pour l'affichage. Il n'existe
 * volontairement aucune fonction du type `calculateVigilanceScore`.
 *
 * Vocabulaire imposé : « vigilance », « points à examiner », « accompagnement ».
 * Jamais « risque d'échec », « startup à risque » ni « probabilité de réussite » —
 * le système ne mesure pas cela.
 */

// --- Niveaux ----------------------------------------------------------------

const LEVEL_LABELS: Record<VigilanceLevel, string> = {
  LOW: "Faible",
  MEDIUM: "Modérée",
  HIGH: "Élevée",
  CRITICAL: "Critique",
};

/** Ton visuel ; le composant le traduit en classes. La couleur reste un renfort. */
const LEVEL_TONES: Record<VigilanceLevel, "neutral" | "info" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export type VigilanceTone = (typeof LEVEL_TONES)[VigilanceLevel];

export const VIGILANCE_LEVELS: VigilanceLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function getVigilanceLevelLabel(level: VigilanceLevel): string {
  return LEVEL_LABELS[level];
}

export function getVigilanceLevelTone(level: VigilanceLevel): VigilanceTone {
  return LEVEL_TONES[level];
}

/** « 68 / 100 — Vigilance élevée », toujours accompagné du texte. */
export function formatVigilanceScore(score: number): string {
  return `${score} / 100`;
}

export function getVigilanceLevelSentence(level: VigilanceLevel): string {
  switch (level) {
    case "CRITICAL":
      return "Plusieurs éléments de ce suivi appellent une intervention rapide de l’équipe.";
    case "HIGH":
      return "Cette startup présente plusieurs éléments nécessitant une attention particulière.";
    case "MEDIUM":
      return "Quelques éléments de ce suivi méritent d’être examinés.";
    case "LOW":
    default:
      return "Aucun élément du suivi n’appelle d’attention particulière aujourd’hui.";
  }
}

// --- Sévérités de l'analyse IA ----------------------------------------------

const SEVERITY_WORDS: Record<VigilanceAiSeverity, string> = {
  LOW: "faible",
  MEDIUM: "modérée",
  HIGH: "élevée",
};

const SEVERITY_TONES: Record<VigilanceAiSeverity, VigilanceTone> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export function getAiSeverityTone(severity: VigilanceAiSeverity): VigilanceTone {
  return SEVERITY_TONES[severity];
}

/** Trois lectures différentes de la même échelle : ne pas les confondre. */
export function getRecurrenceLabel(severity: VigilanceAiSeverity): string {
  return `Récurrence ${SEVERITY_WORDS[severity]}`;
}

export function getIssueSeverityLabel(severity: VigilanceAiSeverity): string {
  return `Vigilance ${SEVERITY_WORDS[severity]}`;
}

export function getActionPriorityLabel(priority: VigilanceAiSeverity): string {
  return `Priorité ${SEVERITY_WORDS[priority]}`;
}

// --- Catégories de problème -------------------------------------------------

const CATEGORY_LABELS: Record<VigilanceIssueCategory, string> = {
  SALES: "Commercial",
  FINANCE: "Financement",
  PRODUCT: "Produit",
  TECHNICAL: "Technique",
  TEAM: "Équipe",
  MARKETING: "Marketing",
  LEGAL: "Juridique",
  OPERATIONS: "Opérations",
  OTHER: "Autre",
};

/** Une catégorie inconnue (backend en avance) reste affichable telle quelle. */
export function getVigilanceCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as VigilanceIssueCategory] ?? category;
}

// --- Textes fixes -----------------------------------------------------------

export const VIGILANCE_SCORE_DISCLAIMER =
  "Le score de vigilance met en évidence les éléments pouvant nécessiter une attention particulière dans le suivi de la startup. Il ne constitue pas une prédiction de réussite ou d’échec.";

export const VIGILANCE_AI_INTRO =
  "Cette analyse exploite les dernières mises à jour et objectifs afin de mettre en évidence les difficultés récurrentes et les besoins d’accompagnement.";

export const VIGILANCE_AI_NOTICE =
  "Les suggestions sont générées à partir des informations de suivi disponibles et constituent une aide à l’accompagnement. Elles ne remplacent pas l’analyse de l’équipe MEDIANET.";

export const VIGILANCE_AI_ADVISORY_BADGE = "Aide à l’accompagnement";

export const NO_FOLLOW_UPS_MESSAGE =
  "Aucune startup n’est actuellement en suivi d’incubation.";

export const NO_FOLLOW_UPS_FOR_PROGRAM_MESSAGE =
  "Aucune startup en suivi d’incubation pour ce programme.";

/** Plusieurs filtres combinés : inutile de les énumérer, ils sont à l'écran. */
export const NO_VIGILANCE_MATCH_MESSAGE =
  "Aucune startup ne correspond aux critères sélectionnés.";

/**
 * Cinq premiers scores tous faibles : le dashboard le dit au lieu de présenter
 * son aperçu comme une alerte. Les lignes restent affichées.
 */
export const NO_ELEVATED_VIGILANCE_MESSAGE =
  "Aucune startup ne présente actuellement un niveau de vigilance élevé.";

/** Page demandée au-delà du dernier rang : le backend répond une liste vide. */
export const EMPTY_VIGILANCE_PAGE_MESSAGE =
  "Cette page ne contient aucun suivi.";

export const NO_OBJECTIVES_MESSAGE = "Aucun objectif n’a encore été défini.";

export const NO_UPDATES_MESSAGE =
  "Aucune mise à jour de suivi n’a encore été publiée.";

export const NO_AI_ANALYSIS_MESSAGE =
  "Aucune analyse intelligente n’a encore été générée.";

export const AI_UNAVAILABLE_MESSAGE =
  "L’analyse intelligente est temporairement indisponible. Le score de vigilance reste calculé normalement.";

export const AI_GENERATION_IN_PROGRESS = "Analyse du suivi en cours…";

export const PROGRESS_UNAVAILABLE_MESSAGE = "Progression non disponible";

export const STAGNATION_UNAVAILABLE_MESSAGE =
  "Données insuffisantes pour mesurer la tendance récente.";

// --- Liste : tri, filtres et pagination -------------------------------------

/**
 * Les deux tris du backend, avec leur libellé.
 *
 * ⚠️ Le tri est **serveur** : il porte sur tout le classement, pas sur la page
 * affichée. Rien n'est retrié ici — réordonner la page courante donnerait un
 * ordre différent de celui qui a décidé du découpage.
 */
export const VIGILANCE_SORT_OPTIONS: { value: VigilanceSort; label: string }[] = [
  { value: "score_desc", label: "Vigilance décroissante" },
  { value: "score_asc", label: "Vigilance croissante" },
];

/**
 * Préréglages de période, repris **à l'identique** de `DashboardFilterBar` :
 * mêmes valeurs, mêmes libellés — une seule UX temporelle dans l'application.
 * L'option vide n'existe pas côté dashboard (qui a un défaut à 30 jours) ; ici
 * elle correspond au défaut serveur, « aucune restriction temporelle ».
 */
export const VIGILANCE_PERIOD_OPTIONS: { value: VigilancePeriod; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "3m", label: "3 derniers mois" },
  { value: "1y", label: "12 derniers mois" },
  { value: "custom", label: "Période personnalisée" },
];

/**
 * Y a-t-il, dans cette page, une startup au niveau élevé ou critique ?
 *
 * Simple lecture des niveaux déjà décidés par le backend : aucun seuil n'est
 * (re)calculé ici. Sert à ne pas présenter l'aperçu du dashboard comme une
 * alerte quand les cinq premiers scores sont tous faibles.
 */
export function hasElevatedVigilance(items: StartupVigilanceListItem[]): boolean {
  return items.some((item) => item.level === "HIGH" || item.level === "CRITICAL");
}

/** « 47 suivis » — toujours issu de `pagination.totalItems`, jamais de `items.length`. */
export function formatVigilanceTotal(totalItems: number): string {
  return `${totalItems} ${totalItems > 1 ? "suivis" : "suivi"}`;
}

/** « Page 2 sur 3 ». `totalPages` vaut 0 quand le classement est vide. */
export function formatVigilancePageStatus(
  pagination: StartupVigilancePagination,
): string {
  return `Page ${pagination.page} sur ${Math.max(1, pagination.totalPages)}`;
}

/**
 * Le classement est vide : la formulation dit **pourquoi**, dans l'ordre où
 * l'administrateur se pose la question — ce qu'il vient de taper d'abord, puis
 * le seul filtre posé, puis le cas général.
 *
 * Le statut vaut `ACTIVE` par défaut côté serveur : il ne compte comme filtre
 * que s'il a été changé, sinon le message généraliste s'afficherait sur un
 * écran où l'administrateur n'a rien filtré.
 */
export function getVigilanceEmptyMessage(state: VigilanceListParamsState): string {
  const search = state.search.trim();

  if (search) {
    return `Aucune startup trouvée pour « ${search} ».`;
  }

  const activeFilters = countActiveVigilanceFilters(state);

  if (activeFilters === 1 && state.programId) {
    return NO_FOLLOW_UPS_FOR_PROGRAM_MESSAGE;
  }

  return activeFilters > 0 ? NO_VIGILANCE_MATCH_MESSAGE : NO_FOLLOW_UPS_MESSAGE;
}

/** `null` = le scoring n'a pas de mesure représentative, pas « 0 % ». */
export function formatVigilanceProgress(progress: number | null): string {
  return progress === null ? PROGRESS_UNAVAILABLE_MESSAGE : `${Math.round(progress)} %`;
}

/**
 * La progression affichée dans la vigilance est **celle que le scoring a
 * retenue** : `factors.progress.averageProgress`, et seulement lorsque le
 * facteur est applicable et mesurable. Rien n'est moyenné ici.
 *
 * Le socle `progress` de la réponse porte la même valeur ; passer par le
 * facteur rend la règle lisible et garde ses deux drapeaux sous les yeux.
 */
export function getVigilanceRepresentativeProgress(
  item: Pick<StartupVigilanceItem, "factors">,
): number | null {
  const factor = item.factors.progress;

  return factor.applicable && factor.dataSufficient ? factor.averageProgress : null;
}

// --- Facteurs ---------------------------------------------------------------

export type VigilanceFactorRow = {
  key: VigilanceFactorKey;
  label: string;
  score: number;
  maxScore: number;
  /** Phrase métier : un « 18 / 30 » seul ne dit rien à un lecteur. */
  detail: string;
  /** false quand le zéro vient d'un manque de données, pas d'une absence de sujet. */
  measured: boolean;
};

const FACTOR_LABELS: Record<VigilanceFactorKey, string> = {
  overdueObjectives: "Objectifs en retard",
  blockedObjectives: "Objectifs bloqués",
  inactivity: "Inactivité",
  progress: "Progression",
  stagnation: "Stagnation",
};

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

/** `+2 points`, `-3 points`, `0 point` — le signe est porteur de sens. */
export function formatSignedPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const unit = Math.abs(rounded) > 1 ? "points" : "point";

  return `${sign}${String(rounded).replace(".", ",")} ${unit}`;
}

function describeOverdue(factors: VigilanceFactors): string {
  const factor = factors.overdueObjectives;

  if (!factor.applicable) {
    return "Aucun objectif actif avec échéance.";
  }

  return factor.count === 0
    ? `Aucun retard sur ${pluralize(factor.eligibleCount, "objectif daté", "objectifs datés")}.`
    : `${pluralize(factor.count, "objectif concerné", "objectifs concernés")} sur ${pluralize(factor.eligibleCount, "objectif daté", "objectifs datés")}.`;
}

function describeBlocked(factors: VigilanceFactors): string {
  const factor = factors.blockedObjectives;

  if (!factor.applicable) {
    return "Aucun objectif actif.";
  }

  return factor.count === 0
    ? `Aucun blocage sur ${pluralize(factor.eligibleCount, "objectif actif", "objectifs actifs")}.`
    : `${pluralize(factor.count, "objectif bloqué", "objectifs bloqués")} sur ${pluralize(factor.eligibleCount, "objectif actif", "objectifs actifs")}.`;
}

function describeInactivity(factors: VigilanceFactors): string {
  const factor = factors.inactivity;
  const days = pluralize(factor.daysSinceLastUpdate, "jour", "jours");

  if (factor.basis === "FOLLOW_UP_CREATED") {
    return `Aucun point d’avancement depuis la création du suivi, il y a ${days}.`;
  }

  return factor.daysSinceLastUpdate === 0
    ? "Dernière mise à jour aujourd’hui."
    : `Dernière mise à jour il y a ${days}.`;
}

function describeProgress(factors: VigilanceFactors): string {
  const factor = factors.progress;

  if (factor.source === "ALL_DONE") {
    return "Tous les objectifs sont terminés.";
  }

  if (factor.averageProgress === null) {
    return `${PROGRESS_UNAVAILABLE_MESSAGE} : aucune mesure exploitable sur les objectifs.`;
  }

  const value = `${Math.round(factor.averageProgress)} %`;
  const base =
    factor.source === "FOLLOW_UP"
      ? `Progression du suivi : ${value}.`
      : `Progression moyenne des objectifs : ${value}.`;

  // Le délai de grâce du backend : le dire évite de faire croire à un oubli.
  return factor.excludedRecentObjectives > 0
    ? `${base} ${pluralize(factor.excludedRecentObjectives, "objectif récent exclu", "objectifs récents exclus")} du calcul.`
    : base;
}

function describeStagnation(factors: VigilanceFactors): string {
  const factor = factors.stagnation;

  // Un zéro de score ici ne veut pas dire « aucune stagnation » : sans deux
  // mesures, le backend ne mesure rien du tout.
  if (!factor.dataSufficient || factor.recentDelta === null) {
    return STAGNATION_UNAVAILABLE_MESSAGE;
  }

  return `Progression récente : ${formatSignedPoints(factor.recentDelta)} par point d’avancement.`;
}

/** Les 5 facteurs dans l'ordre des poids du backend (30, 25, 20, 15, 10). */
export function getVigilanceFactorRows(factors: VigilanceFactors): VigilanceFactorRow[] {
  const rows: { key: VigilanceFactorKey; detail: string; measured: boolean }[] = [
    {
      key: "overdueObjectives",
      detail: describeOverdue(factors),
      measured: factors.overdueObjectives.applicable,
    },
    {
      key: "blockedObjectives",
      detail: describeBlocked(factors),
      measured: factors.blockedObjectives.applicable,
    },
    {
      key: "inactivity",
      detail: describeInactivity(factors),
      measured: factors.inactivity.dataSufficient,
    },
    {
      key: "progress",
      detail: describeProgress(factors),
      measured: factors.progress.dataSufficient,
    },
    {
      key: "stagnation",
      detail: describeStagnation(factors),
      measured: factors.stagnation.dataSufficient,
    },
  ];

  return rows.map((row) => ({
    ...row,
    label: FACTOR_LABELS[row.key],
    score: factors[row.key].score,
    maxScore: factors[row.key].maxScore,
  }));
}

// --- État de l'analyse IA ---------------------------------------------------

export type VigilanceAiState = {
  /** Affiche l'analyse existante. */
  showAnalysis: boolean;
  /** Le bouton de génération/actualisation a-t-il un sens ici ? */
  actionLabel: string | null;
  /** Message expliquant l'état courant, `null` si l'analyse parle d'elle-même. */
  notice: string | null;
  /** true quand l'IA est en panne : le score reste affiché, l'analyse non. */
  degraded: boolean;
};

/**
 * Traduit les 7 statuts du backend en une intention d'affichage.
 *
 * Aucune de ces situations ne doit masquer le score : le backend renvoie 200
 * avec les facteurs même quand tous les fournisseurs sont indisponibles.
 */
export function getVigilanceAiState(
  detail: Pick<StartupVigilanceDetail, "ai" | "aiAnalysis">,
): VigilanceAiState {
  switch (detail.ai.status) {
    case "READY":
      return {
        showAnalysis: detail.aiAnalysis !== null,
        actionLabel: "Actualiser l’analyse",
        notice: null,
        degraded: false,
      };

    case "STALE":
      return {
        showAnalysis: false,
        actionLabel: "Actualiser l’analyse",
        notice:
          "Le suivi a évolué depuis la dernière analyse : actualisez-la pour qu’elle porte sur les données actuelles.",
        degraded: false,
      };

    case "INPUT_CHANGED":
      return {
        showAnalysis: false,
        actionLabel: "Relancer l’analyse",
        notice: "Le suivi a changé pendant l’analyse. Relancez-la.",
        degraded: false,
      };

    case "INSUFFICIENT_DATA":
      return {
        showAnalysis: false,
        actionLabel: null,
        notice:
          "L’analyse intelligente nécessite au moins un point d’avancement rédigé par la startup.",
        degraded: false,
      };

    case "NOT_APPLICABLE":
      return {
        showAnalysis: false,
        actionLabel: null,
        notice:
          "Ce suivi n’est plus actif : seul l’indicateur quantitatif reste consultable.",
        degraded: false,
      };

    case "UNAVAILABLE":
      return {
        showAnalysis: false,
        actionLabel: "Réessayer l’analyse",
        notice: AI_UNAVAILABLE_MESSAGE,
        degraded: true,
      };

    case "NOT_GENERATED":
    default:
      return {
        showAnalysis: false,
        actionLabel: "Générer l’analyse",
        notice: NO_AI_ANALYSIS_MESSAGE,
        degraded: false,
      };
  }
}

/** `analyze` suffit partout : le backend régénère de lui-même un cache périmé. */
export function needsForcedRefresh(status: VigilanceAiStatus): boolean {
  return status === "READY";
}

export function formatVigilanceDate(value: string | null | undefined): string {
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

// --- Sources / evidenceRefs -------------------------------------------------

export type ResolvedEvidence = {
  ref: string;
  kind: "UPDATE" | "OBJECTIVE";
  id: string;
  /** Libellé lisible ; jamais la référence brute `U2`. */
  label: string;
  update?: FollowUpUpdate;
  objective?: FollowUpObjective;
};

export type EvidenceContext = {
  sources: EvidenceSource[];
  updates: FollowUpUpdate[];
  objectives: FollowUpObjective[];
};

function formatEvidenceDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(date);
}

/**
 * Transforme les références du modèle en éléments réels du suivi.
 *
 * Le backend joint `evidenceSources: [{ ref, kind, id }]` avec les vrais
 * identifiants ; les updates et objectifs sont déjà chargés par l'écran. Une
 * référence qu'on ne sait pas résoudre n'est jamais affichée brute : elle est
 * seulement comptée (`unresolvedCount`), ce que le composant rend sous la forme
 * « Basé sur N éléments du suivi ».
 */
export function resolveEvidenceRefs(
  refs: string[],
  context: EvidenceContext,
): { resolved: ResolvedEvidence[]; unresolvedCount: number } {
  const resolved: ResolvedEvidence[] = [];
  let unresolvedCount = 0;

  for (const ref of refs) {
    const source = context.sources.find((candidate) => candidate.ref === ref);

    if (!source) {
      unresolvedCount += 1;
      continue;
    }

    if (source.kind === "UPDATE") {
      const update = context.updates.find((candidate) => candidate.id === source.id);
      const date = formatEvidenceDate(update?.createdAt);

      if (!update || !date) {
        unresolvedCount += 1;
        continue;
      }

      resolved.push({
        ref,
        kind: "UPDATE",
        id: source.id,
        label: `Mise à jour du ${date}`,
        update,
      });
      continue;
    }

    const objective = context.objectives.find((candidate) => candidate.id === source.id);

    if (!objective) {
      unresolvedCount += 1;
      continue;
    }

    resolved.push({
      ref,
      kind: "OBJECTIVE",
      id: source.id,
      label: `Objectif « ${objective.title} »`,
      objective,
    });
  }

  return { resolved, unresolvedCount };
}

/** Repli quand aucune référence n'est résolvable — on ne devine jamais. */
export function getEvidenceFallbackLabel(count: number): string {
  return `Basé sur ${pluralize(count, "élément du suivi", "éléments du suivi")}.`;
}

/** Les champs d'une update qui éclairent réellement une citation. */
export function getEvidenceUpdateFields(
  update: FollowUpUpdate,
): { label: string; value: string }[] {
  return [
    { label: "Réalisé", value: update.done },
    { label: "Blocages", value: update.blockers ?? "" },
    { label: "Besoins", value: update.needs ?? "" },
    { label: "Prochaines étapes", value: update.nextSteps ?? "" },
  ].filter((field) => field.value.trim().length > 0);
}

// --- Erreurs ----------------------------------------------------------------

/**
 * Messages métier. Une panne du module IA n'arrive jamais ici : le backend
 * renvoie 200 avec le score et `ai.status=UNAVAILABLE`. Ce qui passe par cette
 * fonction, c'est l'échec de la requête elle-même.
 */
export function getVigilanceErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Impossible de calculer l’indicateur de vigilance.";
  }

  if (error.status === 404) {
    return "Ce suivi d’incubation est introuvable.";
  }

  if (error.status === 403) {
    return FORBIDDEN_VIGILANCE_MESSAGE;
  }

  return "Impossible de calculer l’indicateur de vigilance.";
}

const FORBIDDEN_VIGILANCE_MESSAGE =
  "Seul un administrateur peut consulter la vigilance des startups.";

export const VIGILANCE_TOP_ERROR_MESSAGE =
  "Impossible de charger les indicateurs de vigilance.";

export const VIGILANCE_LIST_ERROR_MESSAGE =
  "Impossible de charger la liste de vigilance.";

/** Aperçu du dashboard ou liste complète : deux écrans, deux formulations. */
export type VigilanceOverviewVariant = "top" | "list";

/**
 * Erreur de chargement du classement. Le 404 du détail n'a pas d'équivalent ici
 * — une liste vide n'est pas une erreur — mais le 403 garde sa phrase métier.
 * Aucune trace technique n'est exposée.
 */
export function getVigilanceListErrorMessage(
  error: unknown,
  variant: VigilanceOverviewVariant,
): string {
  if (error instanceof ApiError && error.status === 403) {
    return FORBIDDEN_VIGILANCE_MESSAGE;
  }

  return variant === "top" ? VIGILANCE_TOP_ERROR_MESSAGE : VIGILANCE_LIST_ERROR_MESSAGE;
}
