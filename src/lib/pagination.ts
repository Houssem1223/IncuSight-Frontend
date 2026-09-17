export type PaginationParams = {
  page?: number;
  limit?: number;
};

export const DEFAULT_PAGE_SIZE = 25;

/**
 * Ajoute `page`/`limit` a un chemin d'API.
 *
 * ⚠️ Le ValidationPipe backend est en `forbidNonWhitelisted` : n'envoyer que les
 * cles reconnues par PaginationQueryDto, sous peine de 400. Sans parametres, le
 * backend renvoie la liste complete — comportement historique conserve.
 */
export function withPagination(path: string, pagination?: PaginationParams): string {
  if (!pagination) {
    return path;
  }

  const params = new URLSearchParams();

  if (pagination.page !== undefined) {
    params.set("page", String(pagination.page));
  }

  if (pagination.limit !== undefined) {
    params.set("limit", String(pagination.limit));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getPageCount(total: number | null, limit: number): number {
  if (total === null || total <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(total / limit));
}
