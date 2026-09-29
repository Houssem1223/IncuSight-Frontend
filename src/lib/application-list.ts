import { apiFetch, apiFetchWithTotal } from "./api";
import { buildApplicationListPath, type ApplicationListQuery } from "./application-query";
import type { Application } from "../types/application";

// A mismatched payload must be visible as an API error, never silently filtered
// after pagination (which would also produce an incorrect total).
export async function fetchApplicationList(query: ApplicationListQuery, signal?: AbortSignal) {
  const result = await apiFetchWithTotal<Application[]>(buildApplicationListPath(query), { signal });
  if (!Array.isArray(result.data) || result.data.some(application =>
    !application?.id ||
    !["PENDING", "ACCEPTED", "REJECTED"].includes(application.status ?? "") ||
    (query.status && query.status !== "ALL" && application.status !== query.status) ||
    (query.programId && application.programId !== query.programId)
  )) {
    throw new Error("La réponse du serveur ne correspond pas aux filtres demandés. Veuillez réessayer ou contacter l’administrateur.");
  }
  if (result.total !== null && (result.total < result.data.length || !Number.isInteger(result.total))) {
    throw new Error("Le serveur a renvoyé un compteur de candidatures incohérent.");
  }
  return result;
}

export async function fetchApplicationDetail(id: string, signal?: AbortSignal) {
  const application = await apiFetch<Application>(`application/${encodeURIComponent(id)}`, { signal });
  if (application?.id !== id) throw new Error("Le serveur n’a pas renvoyé la candidature demandée.");
  return { data: [application], total: 1 };
}
