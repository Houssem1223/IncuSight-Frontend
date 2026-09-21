import {
  keepPreviousData,
  mutationOptions,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError } from "./api";
import {
  getStartupVigilance,
  getStartupVigilanceList,
} from "./startup-vigilance-api";
import type {
  StartupVigilanceDetail,
  StartupVigilanceListParams,
} from "@/src/types/startup-vigilance";

/**
 * Options TanStack Query partagées par les hooks de vigilance.
 *
 * ⚠️ Les deux familles de clés se distinguent par leur **deuxième segment** :
 * `["startup-vigilance", "list", …]` pour les pages du classement,
 * `["startup-vigilance", "<followUpId>"]` pour un détail. C'est ce qui permet
 * d'invalider toutes les pages d'un coup (préfixe `…, "list"`) sans emporter
 * les détails en cache — l'ancienne clé de liste, `["startup-vigilance"]`, était
 * un préfixe des détails et imposait `exact: true`.
 */

export const startupVigilanceListRootKey = ["startup-vigilance", "list"] as const;

/**
 * Les paramètres font partie de la clé : sans eux, la page 2 du programme A
 * écraserait dans le cache la page 1 du programme B.
 *
 * Les clés absentes ou `undefined` sont ignorées par le hachage de TanStack :
 * `{ page: 1 }` et `{ programId: undefined, page: 1 }` désignent la même entrée.
 */
export function startupVigilanceListKey(
  params: StartupVigilanceListParams = {},
): readonly unknown[] {
  return [
    ...startupVigilanceListRootKey,
    {
      search: params.search,
      programId: params.programId,
      status: params.status,
      phase: params.phase,
      level: params.level,
      period: params.period,
      from: params.from,
      to: params.to,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
    },
  ];
}

export function startupVigilanceDetailKey(followUpId: string): readonly unknown[] {
  return ["startup-vigilance", followUpId];
}

/** Préfixe volontairement non exact : toutes les pages et tous les filtres. */
const listFilters = { queryKey: startupVigilanceListRootKey } as const;

/** Un 403 ou un 404 ne devient pas vrai en réessayant ; une coupure réseau, si. */
function retryUnlessDefinitive(failureCount: number, error: Error): boolean {
  return failureCount < 1 && !(error instanceof ApiError && [403, 404].includes(error.status));
}

/**
 * Une page du classement — une seule requête, jamais un GET par startup, et
 * aucune analyse déclenchée depuis cet écran.
 *
 * Le filtrage par programme, le tri et le découpage sont faits par le serveur :
 * rien n'est retrié ni refiltré ici, sous peine de ne montrer que les
 * correspondances de la page courante.
 */
export function startupVigilanceListOptions(params: StartupVigilanceListParams = {}) {
  return queryOptions({
    queryKey: startupVigilanceListKey(params),
    queryFn: ({ signal }) => getStartupVigilanceList(params, signal),
    // Pattern v5 de `keepPreviousData` : au changement de page ou de filtre, la
    // page précédente reste affichée (`isPlaceholderData`) au lieu de laisser un
    // écran blanc entre deux requêtes.
    placeholderData: keepPreviousData,
    // Le score dépend du temps qui passe (inactivité, échéances franchies) :
    // une relecture au montage et au retour au premier plan évite d'afficher un
    // classement figé, sans pour autant interroger en boucle.
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: retryUnlessDefinitive,
  });
}

/** Lecture seule : le GET du backend ne consulte jamais un modèle. */
export function startupVigilanceDetailOptions(followUpId: string) {
  return queryOptions({
    queryKey: startupVigilanceDetailKey(followUpId),
    queryFn: ({ signal }) => getStartupVigilance(followUpId, signal),
    enabled: Boolean(followUpId),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: retryUnlessDefinitive,
  });
}

/**
 * `analyze` et `refresh` renvoient la réponse détaillée complète : on l'écrit
 * directement dans le cache du détail plutôt que de le relire.
 *
 * La liste, elle, est invalidée : la réponse recalcule le score de ce suivi, et
 * les autres lignes ont pu bouger entre-temps. C'est un GET déterministe, sans
 * appel au modèle. Rien d'autre du cache applicatif n'est touché.
 */
export function startupVigilanceMutationOptions(
  queryClient: QueryClient,
  followUpId: string,
  mutationFn: (id: string) => Promise<StartupVigilanceDetail>,
) {
  const detailFilters = { queryKey: startupVigilanceDetailKey(followUpId), exact: true } as const;

  return mutationOptions({
    mutationFn: () => mutationFn(followUpId),
    // Jamais de retry automatique : chaque tentative consomme du quota chez le
    // fournisseur. Le réessai reste une décision explicite de l'administrateur.
    retry: false,
    onMutate: async () => {
      // Une lecture en vol écraserait la réponse du POST en arrivant après elle.
      await queryClient.cancelQueries(detailFilters);
      return queryClient.getQueryState(detailFilters.queryKey)?.dataUpdateCount ?? 0;
    },
    onSuccess: async (detail, _variables, dataUpdateCount) => {
      await queryClient.cancelQueries(detailFilters);
      const current = queryClient.getQueryState(detailFilters.queryKey);

      if ((current?.dataUpdateCount ?? 0) !== dataUpdateCount || current?.isInvalidated) {
        // Le cache a changé pendant le POST : seule une relecture peut trancher.
        await queryClient.invalidateQueries(detailFilters);
      } else {
        queryClient.setQueryData(detailFilters.queryKey, detail);
      }

      await queryClient.invalidateQueries(listFilters);
    },
  });
}

/** Utilisé quand le suivi change (objectif, point d'avancement, statut…). */
export async function invalidateStartupVigilance(
  queryClient: QueryClient,
  followUpId?: string,
): Promise<void> {
  if (followUpId) {
    const detailFilters = { queryKey: startupVigilanceDetailKey(followUpId), exact: true } as const;
    await queryClient.cancelQueries(detailFilters);
    await queryClient.invalidateQueries(detailFilters);
  }

  await queryClient.invalidateQueries(listFilters);
}
