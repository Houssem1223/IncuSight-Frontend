import { apiFetch } from "./api";
import type {
  StartupVigilanceDetail,
  StartupVigilanceListParams,
  StartupVigilanceListResponse,
} from "@/src/types/startup-vigilance";

/**
 * Client des 4 routes de vigilance du backend (module `startup-vigilance`,
 * toutes `@Roles(ADMIN)`).
 *
 * Le frontend passe exclusivement par le backend NestJS : aucune clé Groq /
 * Mistral / Ollama n'existe côté navigateur, aucun fournisseur n'est appelé
 * directement. Chemin réel :
 * `Next.js -> NestJS -> StartupVigilanceService -> AiService -> providers`.
 *
 * On réutilise `apiFetch` : header Authorization, refresh automatique du token
 * sur 401 et `ApiError` (status + corps) y sont déjà gérés.
 */

const VIGILANCE_BASE_PATH = "admin/startup-vigilance";

export function buildStartupVigilancePath(followUpId?: string): string {
  return followUpId
    ? `${VIGILANCE_BASE_PATH}/${encodeURIComponent(followUpId)}`
    : VIGILANCE_BASE_PATH;
}

/**
 * Query string de la liste, construite comme celle du dashboard
 * (`buildDashboardQuery`) : `URLSearchParams`, jamais de concaténation à la
 * main.
 *
 * ⚠️ Le ValidationPipe backend est en `forbidNonWhitelisted` : seules les clés
 * de `StartupVigilanceListQueryDto` sont envoyées, et une clé absente laisse le
 * backend appliquer sa valeur par défaut — page 1, limite 20, `score_desc`,
 * `status=ACTIVE`, et aucune restriction temporelle.
 */
export function buildStartupVigilanceListQuery(
  params: StartupVigilanceListParams = {},
): string {
  const query = new URLSearchParams();

  // Le backend rejette les chaînes vides (`status=''`, `period=''` → 400) :
  // une valeur absente ou vide se traduit par une clé absente, jamais par
  // `cle=`. `search` est trimé côté serveur, on le trime aussi ici pour ne pas
  // envoyer une requête qui ne filtre rien.
  const optionalStrings: [string, string | undefined][] = [
    ["search", params.search?.trim()],
    ["programId", params.programId],
    ["status", params.status],
    ["phase", params.phase],
    ["level", params.level],
    ["period", params.period],
    ["from", params.from],
    ["to", params.to],
    ["sort", params.sort],
  ];

  for (const [key, value] of optionalStrings) {
    if (value) {
      query.set(key, value);
    }
  }

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  return query.toString();
}

export function buildStartupVigilanceListPath(
  params: StartupVigilanceListParams = {},
): string {
  const query = buildStartupVigilanceListQuery(params);
  return query ? `${buildStartupVigilancePath()}?${query}` : buildStartupVigilancePath();
}

/**
 * Une page du classement des suivis actifs, filtrée par programme et triée par
 * le serveur. Aucun appel au modèle : cette route ne fait que du calcul
 * déterministe.
 *
 * ⚠️ La réponse est une **enveloppe** `{ items, pagination }` depuis la mise à
 * jour du backend : ce n'est plus un tableau. Le total affiché vient toujours
 * de `pagination.totalItems`, jamais de `items.length`.
 */
export function getStartupVigilanceList(
  params: StartupVigilanceListParams = {},
  signal?: AbortSignal,
): Promise<StartupVigilanceListResponse> {
  return apiFetch<StartupVigilanceListResponse>(buildStartupVigilanceListPath(params), {
    signal,
  });
}

/** Score courant + analyse en cache si elle est encore valide. Jamais de génération. */
export function getStartupVigilance(
  followUpId: string,
  signal?: AbortSignal,
): Promise<StartupVigilanceDetail> {
  return apiFetch<StartupVigilanceDetail>(buildStartupVigilancePath(followUpId), { signal });
}

/** Génère l'analyse si nécessaire, sinon renvoie le cache serveur. */
export function analyzeStartupVigilance(
  followUpId: string,
): Promise<StartupVigilanceDetail> {
  return apiFetch<StartupVigilanceDetail>(`${buildStartupVigilancePath(followUpId)}/analyze`, {
    method: "POST",
  });
}

/** Régénération explicite : ignore le cache et consomme des appels au modèle. */
export function refreshStartupVigilanceAnalysis(
  followUpId: string,
): Promise<StartupVigilanceDetail> {
  return apiFetch<StartupVigilanceDetail>(`${buildStartupVigilancePath(followUpId)}/refresh`, {
    method: "POST",
  });
}
