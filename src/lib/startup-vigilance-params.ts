import type { DashboardPeriod } from "./dashboard-api";
import type { FollowUpPhase, FollowUpStatus } from "@/src/types/incubation-followups";
import type {
  StartupVigilanceListParams,
  StartupVigilancePagination,
  VigilanceLevel,
  VigilancePeriod,
  VigilanceSort,
} from "@/src/types/startup-vigilance";

/**
 * Filtres de la liste de vigilance : valeurs par défaut, lecture depuis l'URL,
 * transitions et écriture dans l'URL.
 *
 * Tout est pur et sans React : `useVigilanceListParams` ne fait que brancher ces
 * fonctions sur `useSearchParams` / `router`, et les tests les vérifient sans
 * monter de routeur.
 *
 * ⚠️ **Aucun filtre n'est appliqué ici.** Ce module décide seulement de ce qui
 * part au serveur ; le tri, le découpage et les sept filtres métier sont faits
 * par le backend, qui applique même `level` avant la pagination.
 */

/** Doit rester aligné sur le défaut du backend, sinon la page 1 ne cadre pas. */
export const VIGILANCE_LIST_PAGE_SIZE = 20;

/** Le dashboard n'affiche qu'un aperçu : cinq suivis, jamais plus. */
export const VIGILANCE_TOP_LIMIT = 5;

export const DEFAULT_VIGILANCE_SORT: VigilanceSort = "score_desc";

export const DEFAULT_VIGILANCE_PAGE = 1;

/**
 * ⚠️ Le backend fait `status ?? ACTIVE` : omettre le statut ne veut **pas** dire
 * « tous les statuts », mais « actifs ». Il n'existe aucune valeur permettant de
 * demander les quatre statuts — le Select n'en propose donc pas.
 */
export const DEFAULT_VIGILANCE_STATUS: FollowUpStatus = "ACTIVE";

export type VigilanceListParamsState = {
  /** Chaîne vide = aucune recherche. Jamais `undefined`, pour un input contrôlé. */
  search: string;
  programId?: string;
  status: FollowUpStatus;
  phase?: FollowUpPhase;
  level?: VigilanceLevel;
  /** Absent = aucune restriction temporelle (périmètre historique complet). */
  period?: VigilancePeriod;
  /** Bornes de `period=custom`, au format `yyyy-mm-dd` des `<input type="date">`. */
  from?: string;
  to?: string;
  page: number;
  sort: VigilanceSort;
};

export const DEFAULT_VIGILANCE_LIST_PARAMS: VigilanceListParamsState = {
  search: "",
  programId: undefined,
  status: DEFAULT_VIGILANCE_STATUS,
  phase: undefined,
  level: undefined,
  period: undefined,
  from: undefined,
  to: undefined,
  page: DEFAULT_VIGILANCE_PAGE,
  sort: DEFAULT_VIGILANCE_SORT,
};

/** Limite du `@MaxLength(200)` backend : tronquer vaut mieux qu'un 400. */
export const VIGILANCE_SEARCH_MAX_LENGTH = 200;

const VIGILANCE_SORTS: VigilanceSort[] = ["score_desc", "score_asc"];
const VIGILANCE_STATUSES: FollowUpStatus[] = [
  "ACTIVE",
  "COMPLETED",
  "SUSPENDED",
  "DROPPED",
];
const VIGILANCE_PHASES: FollowUpPhase[] = [
  "ONBOARDING",
  "DIAGNOSTIC",
  "BUILD",
  "MARKET_VALIDATION",
  "PITCH_PREPARATION",
  "CLOSING",
];
const VIGILANCE_LEVEL_VALUES: VigilanceLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VIGILANCE_PERIODS: DashboardPeriod[] = ["7d", "30d", "3m", "1y", "custom"];

export function isVigilanceSort(value: unknown): value is VigilanceSort {
  return VIGILANCE_SORTS.includes(value as VigilanceSort);
}

/** Une valeur d'URL inconnue retombe sur le défaut plutôt que sur un 400. */
export function parseVigilanceSort(value: string | null | undefined): VigilanceSort {
  return isVigilanceSort(value) ? value : DEFAULT_VIGILANCE_SORT;
}

function parseEnum<T extends string>(
  allowed: T[],
  value: string | null | undefined,
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseVigilancePage(value: string | null | undefined): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_VIGILANCE_PAGE;
}

/** `useSearchParams()` renvoie un `ReadonlyURLSearchParams` : seul ce socle est requis. */
type ReadableSearchParams =
  | { get(name: string): string | null; toString(): string }
  | null
  | undefined;

/**
 * Lecture depuis l'URL. Les valeurs illisibles sont ramenées aux défauts : une
 * URL bricolée à la main doit afficher la première page, pas déclencher un 400.
 */
export function parseVigilanceListParams(
  searchParams: ReadableSearchParams,
): VigilanceListParamsState {
  if (!searchParams) {
    return { ...DEFAULT_VIGILANCE_LIST_PARAMS };
  }

  return {
    search: (searchParams.get("search") ?? "").slice(0, VIGILANCE_SEARCH_MAX_LENGTH),
    programId: searchParams.get("programId") || undefined,
    status:
      parseEnum(VIGILANCE_STATUSES, searchParams.get("status")) ??
      DEFAULT_VIGILANCE_STATUS,
    phase: parseEnum(VIGILANCE_PHASES, searchParams.get("phase")),
    level: parseEnum(VIGILANCE_LEVEL_VALUES, searchParams.get("level")),
    period: parseEnum(VIGILANCE_PERIODS, searchParams.get("period")),
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    page: parseVigilancePage(searchParams.get("page")),
    sort: parseVigilanceSort(searchParams.get("sort")),
  };
}

/** Les clés dont le changement invalide la pagination en cours. */
const PAGE_RESETTING_KEYS = [
  "search",
  "programId",
  "status",
  "phase",
  "level",
  "period",
  "from",
  "to",
  "sort",
] as const satisfies readonly (keyof VigilanceListParamsState)[];

/**
 * Transition unique de l'état.
 *
 * ⚠️ Changer un filtre ou le tri **remet la page à 1** : rester en page 4 d'un
 * autre filtrage affiche une page vide, le backend conservant volontairement la
 * page demandée. Seul un changement explicite de page garde la page.
 *
 * Quitter `period=custom` efface `from`/`to` : les garder ferait réapparaître
 * des bornes invisibles au retour sur « Personnalisée ».
 */
export function applyVigilanceListParamChange(
  current: VigilanceListParamsState,
  change: Partial<VigilanceListParamsState>,
): VigilanceListParamsState {
  const next: VigilanceListParamsState = { ...current, ...change };

  if (next.period !== "custom") {
    next.from = undefined;
    next.to = undefined;
  }

  const resets = PAGE_RESETTING_KEYS.some(
    (key) => key in change && next[key] !== current[key],
  );

  if (resets) {
    next.page = DEFAULT_VIGILANCE_PAGE;
  }

  return { ...next, page: Math.max(1, next.page) };
}

/**
 * Écriture dans l'URL, sur une copie : les autres paramètres de l'écran —
 * `followUp` en tête, qui porte la sélection du master-detail — sont conservés.
 * Les valeurs par défaut sont retirées pour ne pas alourdir l'URL partagée.
 */
export function writeVigilanceListParams(
  searchParams: ReadableSearchParams,
  state: VigilanceListParamsState,
): URLSearchParams {
  const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

  const entries: [string, string | undefined][] = [
    ["search", state.search.trim() || undefined],
    ["programId", state.programId],
    ["status", state.status === DEFAULT_VIGILANCE_STATUS ? undefined : state.status],
    ["phase", state.phase],
    ["level", state.level],
    ["period", state.period],
    ["from", state.period === "custom" ? state.from : undefined],
    ["to", state.period === "custom" ? state.to : undefined],
    ["page", state.page > DEFAULT_VIGILANCE_PAGE ? String(state.page) : undefined],
    ["sort", state.sort === DEFAULT_VIGILANCE_SORT ? undefined : state.sort],
  ];

  for (const [key, value] of entries) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  return params;
}

/**
 * Les paramètres réellement envoyés au backend.
 *
 * ⚠️ `period=custom` sans ses deux bornes déclencherait un 400 : tant que
 * l'administrateur n'a pas saisi les deux dates, la période n'est pas envoyée et
 * la liste reste sur le périmètre complet, au lieu de casser l'écran.
 *
 * `status` part toujours explicitement : le défaut serveur est `ACTIVE`, mais
 * l'écrire évite que la liste dépende d'un défaut susceptible de bouger, et
 * rend la clé de cache non ambiguë.
 */
export function toVigilanceListQuery(
  state: VigilanceListParamsState,
  limit: number = VIGILANCE_LIST_PAGE_SIZE,
): StartupVigilanceListParams {
  const hasCustomRange = Boolean(state.from && state.to);
  const period = state.period === "custom" && !hasCustomRange ? undefined : state.period;

  return {
    search: state.search.trim() || undefined,
    programId: state.programId,
    status: state.status,
    phase: state.phase,
    level: state.level,
    period,
    from: period === "custom" ? state.from : undefined,
    to: period === "custom" ? state.to : undefined,
    page: state.page,
    limit,
    sort: state.sort,
  };
}

/**
 * Conversion des filtres globaux du dashboard vers ceux de l'aperçu.
 *
 * ⚠️ `status` n'est **pas** repris : le dashboard filtre des *candidatures*
 * (`PENDING` / `ACCEPTED` / `REJECTED`), la vigilance des *incubations*
 * (`ACTIVE` / `COMPLETED` / `SUSPENDED` / `DROPPED`). Les deux enums n'ont
 * aucune valeur commune — transmettre l'un à l'autre serait un 400. Ce qui
 * traverse, ce sont les filtres que cette route accepte réellement :
 * `programId`, `period` et, pour `custom`, `from`/`to`.
 *
 * Conséquence assumée : le dashboard ayant un défaut à 30 jours, l'aperçu
 * montre par défaut la **cohorte des suivis démarrés sur la période**, comme
 * les cartes d'incubation juste au-dessus — pas tout l'historique.
 */
export function toVigilanceTopParams(filters: {
  programId?: string;
  period?: DashboardPeriod;
  from?: string;
  to?: string;
}): VigilanceListParamsState {
  return {
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    programId: filters.programId,
    period: filters.period,
    from: filters.from,
    to: filters.to,
  };
}

/** Les filtres métier non par défaut, pour l'indicateur et le bouton de reset. */
export function countActiveVigilanceFilters(state: VigilanceListParamsState): number {
  return [
    Boolean(state.search.trim()),
    Boolean(state.programId),
    state.status !== DEFAULT_VIGILANCE_STATUS,
    Boolean(state.phase),
    Boolean(state.level),
    Boolean(state.period),
  ].filter(Boolean).length;
}

/** Le tri ne compte pas comme un filtre, mais le reset le ramène au défaut. */
export function hasNonDefaultVigilanceParams(state: VigilanceListParamsState): boolean {
  return countActiveVigilanceFilters(state) > 0 || state.sort !== DEFAULT_VIGILANCE_SORT;
}

/**
 * Remise à zéro complète. `page` repart à 1 et le tri au défaut ; `followUp`
 * n'est pas concerné — il vit dans l'URL de l'écran, pas dans ces filtres, et la
 * colonne de détail ne dépend pas du classement.
 */
export function resetVigilanceListParams(): VigilanceListParamsState {
  return { ...DEFAULT_VIGILANCE_LIST_PARAMS };
}

/**
 * Page hors limites : le backend conserve la page demandée et renvoie une liste
 * vide. On ne corrige que si une page existe réellement, et la correction
 * ramène à 1 — page qui existe toujours quand `totalPages >= 1`, donc sans
 * boucle de requêtes possible.
 */
export function getOutOfRangeVigilancePage(
  pagination: StartupVigilancePagination | undefined,
): number | null {
  if (!pagination || pagination.totalPages <= 0) {
    return null;
  }

  return pagination.page > pagination.totalPages ? DEFAULT_VIGILANCE_PAGE : null;
}
