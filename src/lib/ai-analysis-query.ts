import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
import { getApplicationAiAnalysis } from "./ai-analysis-api";
import type { ApplicationAiAnalysis, ReadyAiAnalysis } from "@/src/types/ai-analysis";

export function aiAnalysisQueryKey(applicationId: string): readonly unknown[] {
  return ["ai-analysis", "application", applicationId];
}

export function applicationAiAnalysisOptions(applicationId: string) {
  return queryOptions({
    queryKey: aiAnalysisQueryKey(applicationId),
    queryFn: ({ signal }) => getApplicationAiAnalysis(applicationId, signal),
    enabled: Boolean(applicationId),
    staleTime: 30_000,
    // Un autre utilisateur peut soumettre un avis ou régénérer l'analyse.
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: (failureCount, error) =>
      failureCount < 1 && !(error instanceof ApiError && [403, 404].includes(error.status)),
  });
}

/** Retire immédiatement le résultat périmé, même si la relecture échoue. */
export async function invalidateApplicationAiAnalysis(
  queryClient: QueryClient,
  applicationId: string,
) {
  const filters = { queryKey: aiAnalysisQueryKey(applicationId), exact: true };
  await queryClient.cancelQueries(filters);
  queryClient.setQueryData<ApplicationAiAnalysis>(filters.queryKey, (current) =>
    current?.status === "READY"
      ? {
          applicationId,
          status: "STALE",
          analysis: null,
          message: "Les évaluations ont changé depuis la dernière analyse.",
        }
      : current,
  );
  await queryClient.invalidateQueries(filters);
}

export function applicationAiAnalysisMutationOptions(
  queryClient: QueryClient,
  applicationId: string,
  mutationFn: (id: string) => Promise<ReadyAiAnalysis>,
) {
  const filters = { queryKey: aiAnalysisQueryKey(applicationId), exact: true };

  return mutationOptions({
    mutationFn: () => mutationFn(applicationId),
    retry: false,
    onMutate: async () => {
      await queryClient.cancelQueries(filters);
      // Une réouverture pendant la génération rend aussi sa réponse suspecte.
      return queryClient.getQueryState(filters.queryKey)?.dataUpdateCount ?? 0;
    },
    onSuccess: async (analysis, _variables, dataUpdateCount) => {
      // Annule aussi une lecture démarrée pendant le POST (focus, reconnexion…).
      await queryClient.cancelQueries(filters);
      const current = queryClient.getQueryState(filters.queryKey);
      if ((current?.dataUpdateCount ?? 0) !== dataUpdateCount || current?.isInvalidated) {
        // Une autre action a modifié le cache : seul un nouveau GET peut trancher.
        await queryClient.invalidateQueries(filters);
        return;
      }
      queryClient.setQueryData(filters.queryKey, analysis);
    },
  });
}
