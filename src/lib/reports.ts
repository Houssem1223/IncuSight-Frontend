import { downloadAuthenticatedFile } from "./download";

/**
 * Exports de documents produits par le backend (module `reports`). Reserves aux
 * admins cote serveur — ces helpers ne font aucun controle d'acces.
 */
export async function downloadEvaluationReport(
  applicationId: string,
  token: string,
): Promise<void> {
  return downloadAuthenticatedFile(
    `reports/applications/${applicationId}/evaluations.pdf`,
    token,
    "grille-evaluation.pdf",
    "Impossible de generer la grille d'evaluation.",
  );
}

export async function downloadDecisionReport(
  applicationId: string,
  token: string,
): Promise<void> {
  return downloadAuthenticatedFile(
    `reports/applications/${applicationId}/decision.pdf`,
    token,
    "fiche-decision.pdf",
    "Impossible de generer la fiche de decision.",
  );
}

export type ReportFilters = {
  status?: string;
  programId?: string;
};

// Le ValidationPipe backend est en forbidNonWhitelisted : tout param hors du DTO
// renvoie 400. On n'envoie donc que les cles connues, et jamais "ALL" qui n'est
// qu'une valeur d'affichage cote UI.
function buildReportQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "ALL") {
    params.set("status", filters.status);
  }

  if (filters.programId) {
    params.set("programId", filters.programId);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function downloadApplicationsCsv(
  token: string,
  filters: ReportFilters = {},
): Promise<void> {
  return downloadAuthenticatedFile(
    `reports/applications.csv${buildReportQuery(filters)}`,
    token,
    "candidatures.csv",
    "Impossible d'exporter les candidatures.",
  );
}

export async function downloadStartupsCsv(token: string): Promise<void> {
  return downloadAuthenticatedFile(
    "reports/startups.csv",
    token,
    "startups.csv",
    "Impossible d'exporter les startups.",
  );
}

export async function downloadIncubationCsv(
  token: string,
  filters: ReportFilters = {},
): Promise<void> {
  return downloadAuthenticatedFile(
    `reports/incubation.csv${buildReportQuery(filters)}`,
    token,
    "suivis-incubation.csv",
    "Impossible d'exporter les suivis d'incubation.",
  );
}
