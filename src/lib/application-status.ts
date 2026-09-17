import type { ApplicationStatus } from "@/src/types/application";

/**
 * Libelles des trois statuts de candidature. Ils etaient reecrits a chaque
 * ecran ; ils sont desormais lus au moins par le panneau de notifications et
 * par l'historique des revisions de decision, qui doivent nommer un statut de
 * la meme facon.
 */
const labels: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
};

/** Renvoie la valeur brute si le backend introduit un statut inconnu de l'UI. */
export function applicationStatusLabel(status?: ApplicationStatus | null): string {
  if (typeof status !== "string" || !status.trim()) {
    return "-";
  }

  const normalized = status.trim().toUpperCase();

  return labels[normalized] || status.trim();
}
