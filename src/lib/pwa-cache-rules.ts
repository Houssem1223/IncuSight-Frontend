// Criteres de cache du service worker (src/sw.ts), isoles ici pour etre testes
// sans environnement de service worker. Toute requete qui ne correspond a
// aucun de ces criteres n'est pas interceptee : c'est le cas de l'API NestJS
// (origine distincte), de socket.io, des payloads RSC et des telechargements.

export type CacheRuleInput = {
  url: URL;
  sameOrigin: boolean;
  request: { mode: string; method?: string };
};

/** Chunks JS/CSS et polices du build : noms hashes, contenu immuable. */
export function isImmutableBuildAsset({ url, sameOrigin }: CacheRuleInput): boolean {
  return sameOrigin && url.pathname.startsWith("/_next/static/");
}

export function isAppIcon({ url, sameOrigin }: CacheRuleInput): boolean {
  return sameOrigin && (url.pathname.startsWith("/icons/") || url.pathname === "/favicon.ico");
}

/**
 * Navigation vers une page du frontend. Elle part toujours sur le reseau et
 * n'est jamais mise en cache ; seul son echec reseau declenche la page hors ligne.
 */
export function isAppNavigation({ request, sameOrigin }: CacheRuleInput): boolean {
  return sameOrigin && request.mode === "navigate";
}
