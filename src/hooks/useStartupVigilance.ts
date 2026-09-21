"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  analyzeStartupVigilance,
  refreshStartupVigilanceAnalysis,
} from "@/src/lib/startup-vigilance-api";
import {
  startupVigilanceDetailOptions,
  startupVigilanceListOptions,
  startupVigilanceMutationOptions,
} from "@/src/lib/startup-vigilance-query";
import type {
  StartupVigilanceDetail,
  StartupVigilanceListParams,
  StartupVigilanceListResponse,
} from "@/src/types/startup-vigilance";

/**
 * Accès à la vigilance des startups, via TanStack Query — déjà monté pour tout
 * le dashboard par `DashboardQueryProvider`.
 *
 * Aucun de ces hooks ne déclenche d'analyse IA automatiquement : seules les
 * mutations, appelées sur clic explicite depuis la page de détail, le font.
 */

/**
 * Une page du classement des suivis actifs, en une seule requête.
 *
 * ⚠️ La réponse est l'enveloppe `{ items, pagination }` du backend : le total
 * affiché vient de `pagination.totalItems`, jamais de `items.length`, qui ne
 * compte que la page courante.
 */
export function useStartupVigilanceList(
  params: StartupVigilanceListParams = {},
): UseQueryResult<StartupVigilanceListResponse> {
  return useQuery(startupVigilanceListOptions(params));
}

/** Score et analyse en cache d'un suivi. Ne génère jamais. */
export function useStartupVigilance(
  followUpId: string,
  sharedDetail = false,
): UseQueryResult<StartupVigilanceDetail> {
  return useQuery({ ...startupVigilanceDetailOptions(followUpId), ...(sharedDetail ? { refetchOnMount: false } : {}) });
}

function useVigilanceMutation(
  followUpId: string,
  mutationFn: (id: string) => Promise<StartupVigilanceDetail>,
): UseMutationResult<StartupVigilanceDetail, unknown, void, number> {
  const queryClient = useQueryClient();

  return useMutation(startupVigilanceMutationOptions(queryClient, followUpId, mutationFn));
}

/** Génère l'analyse si nécessaire, sinon renvoie le cache serveur valide. */
export function useAnalyzeStartupVigilance(
  followUpId: string,
): UseMutationResult<StartupVigilanceDetail, unknown, void, number> {
  return useVigilanceMutation(followUpId, analyzeStartupVigilance);
}

/** Régénère explicitement : ignore le cache serveur et rappelle le modèle. */
export function useRefreshStartupVigilance(
  followUpId: string,
): UseMutationResult<StartupVigilanceDetail, unknown, void, number> {
  return useVigilanceMutation(followUpId, refreshStartupVigilanceAnalysis);
}
