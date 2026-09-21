"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  generateApplicationAiAnalysis,
  refreshApplicationAiAnalysis,
} from "@/src/lib/ai-analysis-api";
import {
  applicationAiAnalysisOptions,
  applicationAiAnalysisMutationOptions,
} from "@/src/lib/ai-analysis-query";
import type { ApplicationAiAnalysis, ReadyAiAnalysis } from "@/src/types/ai-analysis";

/**
 * Lecture de l'analyse existante. Le GET du backend ne consulte jamais un
 * modèle : il est sûr de l'appeler au montage de l'écran.
 *
 * La réouverture invalide le cache ; montage et retour au premier plan relisent
 * aussi l'état pour détecter les changements effectués par d'autres utilisateurs.
 */
export function useApplicationAiAnalysis(
  applicationId: string,
): UseQueryResult<ApplicationAiAnalysis> {
  return useQuery(applicationAiAnalysisOptions(applicationId));
}

/**
 * Les options partagées protègent le cache des GET tardifs et des réouvertures
 * concurrentes. Hors conflit, la réponse du POST remplit directement le cache.
 */
function useAiAnalysisMutation(
  applicationId: string,
  mutationFn: (id: string) => Promise<ReadyAiAnalysis>,
): UseMutationResult<ReadyAiAnalysis, unknown, void, number> {
  const queryClient = useQueryClient();

  return useMutation(applicationAiAnalysisMutationOptions(queryClient, applicationId, mutationFn));
}

/** Génère l'analyse, ou renvoie le cache serveur s'il est encore valide. */
export function useGenerateApplicationAiAnalysis(
  applicationId: string,
): UseMutationResult<ReadyAiAnalysis, unknown, void, number> {
  return useAiAnalysisMutation(applicationId, generateApplicationAiAnalysis);
}

/** Régénère explicitement : ignore le cache serveur et rappelle le modèle. */
export function useRefreshApplicationAiAnalysis(
  applicationId: string,
): UseMutationResult<ReadyAiAnalysis, unknown, void, number> {
  return useAiAnalysisMutation(applicationId, refreshApplicationAiAnalysis);
}
