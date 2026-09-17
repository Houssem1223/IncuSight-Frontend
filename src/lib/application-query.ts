import { withPagination, type PaginationParams } from "./pagination";

/**
 * Filtres de la liste admin des candidatures.
 *
 * Le statut part au serveur avec la pagination : le filtrer apres coup sur une
 * page deja decoupee ne montrerait que les correspondances de cette page.
 */
export type ApplicationListQuery = PaginationParams & {
  status?: string;
  programId?: string;
};

/**
 * ⚠️ Le ValidationPipe backend est en `forbidNonWhitelisted` : n'envoyer que les
 * cles reconnues par ListApplicationsQueryDto, sinon la requete repond 400.
 * `ALL` est une valeur d'affichage cote UI, jamais un statut backend.
 */
export function buildApplicationListPath(query?: ApplicationListQuery): string {
  const path = withPagination("application", query);
  const params = new URLSearchParams();

  if (query?.status && query.status !== "ALL") {
    params.set("status", query.status);
  }

  if (query?.programId) {
    params.set("programId", query.programId);
  }

  const extra = params.toString();

  if (!extra) {
    return path;
  }

  return `${path}${path.includes("?") ? "&" : "?"}${extra}`;
}
