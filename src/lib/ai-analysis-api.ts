import { apiFetch } from "./api";
import type { ApplicationAiAnalysis, ReadyAiAnalysis } from "@/src/types/ai-analysis";

/**
 * Client des 3 routes d'analyse IA du backend (module `ai`, reservees a ADMIN).
 *
 * Le frontend passe exclusivement par le backend NestJS : aucune cle Groq /
 * Mistral / Ollama n'existe cote navigateur, aucun fournisseur n'est appele
 * directement. Chemin reel : Next.js -> NestJS -> AiService -> providers.
 *
 * On reutilise `apiFetch` : header Authorization, refresh automatique du token
 * sur 401 et `ApiError` (status + corps) sont deja geres la-bas.
 */

function buildAiAnalysisPath(applicationId: string): string {
  return `admin/applications/${encodeURIComponent(applicationId)}/ai-analysis`;
}

/** Lecture seule : le backend ne consulte jamais un modele sur cette route. */
export function getApplicationAiAnalysis(
  applicationId: string,
  signal?: AbortSignal,
): Promise<ApplicationAiAnalysis> {
  return apiFetch<ApplicationAiAnalysis>(buildAiAnalysisPath(applicationId), { signal });
}

/** Genere si necessaire, sinon renvoie le cache serveur encore valide. */
export function generateApplicationAiAnalysis(
  applicationId: string,
): Promise<ReadyAiAnalysis> {
  return apiFetch<ReadyAiAnalysis>(buildAiAnalysisPath(applicationId), {
    method: "POST",
  });
}

/** Regeneration explicite : ignore le cache et consomme des appels au modele. */
export function refreshApplicationAiAnalysis(
  applicationId: string,
): Promise<ReadyAiAnalysis> {
  return apiFetch<ReadyAiAnalysis>(`${buildAiAnalysisPath(applicationId)}/refresh`, {
    method: "POST",
  });
}

export { buildAiAnalysisPath };
