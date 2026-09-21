import type { FollowUpPhase, FollowUpStatus } from "./incubation-followups";
import type { DashboardPeriod } from "@/src/lib/dashboard-api";

/**
 * Vigilance des startups incubées.
 *
 * Types recopiés du contrat réel du module `startup-vigilance` du backend
 * (`dto/vigilance-response.dto.ts`, `dto/startup-vigilance-list-response.dto.ts`,
 * `dto/startup-vigilance-list-query.dto.ts`, `dto/vigilance-insight.dto.ts`,
 * `types/vigilance.types.ts`, documentés dans
 * `IncuSight-Backend/docs/STARTUP_VIGILANCE.md`). Si le backend change une forme
 * de réponse, mettre à jour ce fichier ET `docs/startup-vigilance-frontend.md`
 * dans la même tâche.
 *
 * ⚠️ Le score est un **indicateur d'attention**, pas un pronostic. Aucun libellé
 * de l'interface ne doit parler de risque d'échec ou de probabilité de réussite.
 *
 * `FollowUpStatus` et `FollowUpPhase` sont réutilisés depuis
 * `incubation-followups.ts` : ce sont les mêmes enums Prisma, il n'y a pas de
 * raison d'en tenir une seconde copie.
 */

export type VigilanceLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Sévérité, récurrence et priorité partagent cette échelle côté backend. */
export type VigilanceAiSeverity = "LOW" | "MEDIUM" | "HIGH";

export type VigilanceIssueCategory =
  | "SALES"
  | "FINANCE"
  | "PRODUCT"
  | "TECHNICAL"
  | "TEAM"
  | "MARKETING"
  | "LEGAL"
  | "OPERATIONS"
  | "OTHER";

/**
 * `applicable` : le facteur a un dénominateur (ex. des objectifs actifs).
 * `dataSufficient` : les données permettent de le mesurer.
 * Les deux valent `false` quand le facteur vaut zéro faute de données — un zéro
 * ne doit donc jamais être lu comme « tout va bien ».
 */
export type VigilanceFactorBase = {
  score: number;
  maxScore: number;
  applicable: boolean;
  dataSufficient: boolean;
};

export type OverdueObjectivesFactor = VigilanceFactorBase & {
  count: number;
  ratio: number;
  eligibleCount: number;
};

export type BlockedObjectivesFactor = VigilanceFactorBase & {
  count: number;
  ratio: number;
  eligibleCount: number;
};

export type InactivityFactor = VigilanceFactorBase & {
  daysSinceLastUpdate: number;
  /** Référence du calcul : dernier point d'avancement, ou création du suivi. */
  basis: "LAST_UPDATE" | "FOLLOW_UP_CREATED";
};

export type ProgressFactor = VigilanceFactorBase & {
  averageProgress: number | null;
  source: "OBJECTIVES" | "ALL_DONE" | "FOLLOW_UP" | "INSUFFICIENT";
  /** Objectifs trop récents pour être comptés (délai de grâce du backend). */
  excludedRecentObjectives: number;
};

export type StagnationFactor = VigilanceFactorBase & {
  /** Points de progression gagnés par intervalle observé, `null` si non mesurable. */
  recentDelta: number | null;
  measurements: number;
};

export type VigilanceFactors = {
  overdueObjectives: OverdueObjectivesFactor;
  blockedObjectives: BlockedObjectivesFactor;
  inactivity: InactivityFactor;
  progress: ProgressFactor;
  stagnation: StagnationFactor;
};

export type VigilanceFactorKey = keyof VigilanceFactors;

/** Permet de retrouver, dans le suivi, l'élément cité par le modèle. */
export type EvidenceSource = {
  /** `U1`, `O3`… — référence temporaire, jamais montrée telle quelle. */
  ref: string;
  kind: "UPDATE" | "OBJECTIVE";
  id: string;
};

export type VigilanceIssue = {
  category: VigilanceIssueCategory;
  title: string;
  description: string;
  recurrence: VigilanceAiSeverity;
  severity: VigilanceAiSeverity;
  evidenceRefs: string[];
};

export type VigilancePositiveSignal = {
  description: string;
  evidenceRefs: string[];
};

export type VigilanceSuggestedAction = {
  action: string;
  reason: string;
  priority: VigilanceAiSeverity;
  evidenceRefs: string[];
};

export type VigilanceAiAnalysis = {
  summary: string;
  mainIssues: VigilanceIssue[];
  positiveSignals: VigilancePositiveSignal[];
  attentionPoints: string[];
  suggestedActions: VigilanceSuggestedAction[];
};

/**
 * `READY` — analyse disponible.
 * `NOT_GENERATED` — jamais générée.
 * `STALE` — une analyse existe mais les données ont changé ; le backend refuse
 * de la servir.
 * `INSUFFICIENT_DATA` — pas de point d'avancement textuel exploitable, aucun
 * appel au modèle n'est tenté.
 * `NOT_APPLICABLE` — suivi non actif : consultation quantitative uniquement.
 * `UNAVAILABLE` — l'IA ou son cache est indisponible ; le score reste calculé.
 * `INPUT_CHANGED` — le suivi a changé pendant la génération.
 */
export type VigilanceAiStatus =
  | "READY"
  | "NOT_GENERATED"
  | "STALE"
  | "INSUFFICIENT_DATA"
  | "NOT_APPLICABLE"
  | "UNAVAILABLE"
  | "INPUT_CHANGED";

export type VigilanceAiMetadata = {
  status: VigilanceAiStatus;
  fromCache: boolean;
  /** Détails techniques : ne pas afficher dans l'interface métier. */
  provider: string | null;
  model: string | null;
  generatedAt: string | null;
  message: string | null;
  errorCode: string | null;
};

/**
 * Socle commun à la liste et au détail.
 *
 * ⚠️ `progress` vaut `factors.progress.averageProgress` : c'est la progression
 * *représentative retenue par le scoring*, nullable, pas `IncubationFollowUp.progress`.
 */
export type StartupVigilanceItem = {
  followUpId: string;
  startupId: string;
  startupName: string;
  status: FollowUpStatus;
  phase: FollowUpPhase;
  progress: number | null;
  /** Entier 0-100, calculé par le backend. Jamais recalculé ici. */
  score: number;
  level: VigilanceLevel;
  factors: VigilanceFactors;
};

/**
 * Une ligne de la liste. Le backend ne renvoie que les suivis `ACTIVE`, classés
 * globalement puis découpés en pages.
 *
 * ⚠️ `programId`/`programName` n'existent que sur la **liste**
 * (`StartupVigilanceListItemDto`) : le détail ne les porte pas. C'est pourquoi
 * les deux formes dérivent d'un socle commun plutôt que l'une de l'autre.
 */
export type StartupVigilanceListItem = StartupVigilanceItem & {
  programId: string;
  /** `Program.title` — affiché tel quel, jamais reconstruit. */
  programName: string;
};

export type StartupVigilanceDetail = StartupVigilanceItem & {
  aiAnalysis: VigilanceAiAnalysis | null;
  ai: VigilanceAiMetadata;
  evidenceSources: EvidenceSource[];
  meta: {
    advisoryOnly: true;
    scoredAt: string;
    coverage: {
      updateLimit: number;
      omittedObjectives: number;
      textTruncated: boolean;
    };
  };
};

/** Les deux seuls tris acceptés par le backend (`VigilanceSort`). */
export type VigilanceSort = "score_desc" | "score_asc";

/**
 * Préréglages de période de la liste : le backend réutilise littéralement
 * l'enum `DashboardPeriodPreset` du module dashboard, d'où l'alias plutôt
 * qu'une seconde définition.
 */
export type VigilancePeriod = DashboardPeriod;

/**
 * Paramètres de `GET admin/startup-vigilance`, recopiés un par un de
 * `StartupVigilanceListQueryDto`. Tous facultatifs.
 *
 * Défauts appliqués par le serveur quand la clé est absente :
 *
 * | Clé | Absente ⇒ |
 * |---|---|
 * | `status` | **`ACTIVE`** — ce n'est pas « tous les statuts » : le service fait `status ?? ACTIVE`, il n'existe aucune façon de demander les quatre |
 * | `period` | aucune restriction temporelle (périmètre historique complet) |
 * | `page` / `limit` / `sort` | 1 / 20 / `score_desc` |
 * | `search` / `programId` / `phase` / `level` | aucun filtre |
 *
 * ⚠️ Le ValidationPipe backend est en `forbidNonWhitelisted` **et** rejette les
 * valeurs vides (`status=''`, `period=''`, `programId=''` → 400) : n'envoyer que
 * ces clés, et jamais une chaîne vide. `limit` est plafonné à 100, `search` à
 * 200 caractères, `programId` doit être un CUID.
 *
 * ⚠️ `period=custom` **exige** `from` et `to`, avec `from < to`, sinon 400.
 *
 * ⚠️ `level` est appliqué par le serveur **avant** la pagination, sur le
 * classement complet : `totalItems` en tient compte. C'est un vrai filtre
 * global, pas un filtre de page.
 */
export type StartupVigilanceListParams = {
  /** Nom de startup, insensible à la casse. Jamais envoyé vide. */
  search?: string;
  programId?: string;
  /** Absent ⇒ `ACTIVE` côté serveur. Le frontend l'envoie toujours explicitement. */
  status?: FollowUpStatus;
  phase?: FollowUpPhase;
  level?: VigilanceLevel;
  /** Cohorte par `startDate`, mêmes préréglages que le dashboard. */
  period?: VigilancePeriod;
  /** ISO 8601, requis avec `period=custom`. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: VigilanceSort;
};

/**
 * Enveloppe de pagination de la liste de vigilance.
 *
 * C'est le premier endpoint du projet à renvoyer une enveloppe : les autres
 * listes paginées (`application`, `notifications`, `users`) renvoient un
 * tableau et passent leur total par l'en-tête `X-Total-Count` (voir
 * `ApiResult` dans `lib/api.ts`). Il n'y a donc aucun type d'enveloppe
 * existant à réutiliser ici.
 *
 * ⚠️ `totalItems` est le total **serveur**, tous programmes filtrés compris :
 * il ne se déduit jamais de `items.length`, qui n'est que la page courante.
 */
export type StartupVigilancePagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type StartupVigilanceListResponse = {
  items: StartupVigilanceListItem[];
  pagination: StartupVigilancePagination;
};
