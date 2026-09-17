import { apiFetch, API_URL } from "./api";

export type ShowcaseStartup = {
  id: string;
  startupName: string;
  description: string | null;
  sector: string | null;
  stage: string | null;
  website: string | null;
  linkedinUrl: string | null;
  hasLogo: boolean;
  programTitle: string | null;
  incubationStatus: string | null;
  incubationPhase: string | null;
  incubationStartDate: string | null;
};

/** Route publique : aucun token n'est envoye (voir ENDPOINTS_WITHOUT_BEARER). */
export function getPublicShowcase(): Promise<ShowcaseStartup[]> {
  return apiFetch<ShowcaseStartup[]>("startup/public");
}

/**
 * Le logo de la vitrine est servi sans authentification : contrairement au
 * dashboard, une balise <img> peut donc pointer directement dessus.
 */
export function publicLogoUrl(startupId: string): string {
  return `${API_URL}/startup/public/${startupId}/logo`;
}

/**
 * Une startup dont l'incubation est terminee (ou abandonnee) releve des alumni,
 * les autres du portefeuille en cours.
 */
export function isAlumni(startup: ShowcaseStartup): boolean {
  return startup.incubationStatus === "COMPLETED" || startup.incubationStatus === "DROPPED";
}
