/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Service worker d'IncuSight, compile par esbuild via src/app/serwist/[path]/route.ts.
// Strategie documentee dans docs/pwa.md. Regle directrice : seuls les assets
// statiques du build et les icones sont mis en cache. Aucune page HTML, aucun
// payload RSC et aucune reponse de l'API NestJS (origine distincte) ne l'est.
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { OFFLINE_ROUTE } from "./lib/pwa";
import { isAppIcon, isAppNavigation, isImmutableBuildAsset } from "./lib/pwa-cache-rules";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const STATIC_CACHE = "incusight-next-static-v1";
const ICONS_CACHE = "incusight-icons-v1";
const RUNTIME_CACHES = new Set([STATIC_CACHE, ICONS_CACHE]);

// Les regles ne s'appliquent qu'a l'origine du frontend. Une requete sans regle
// (API, socket.io, telechargements, logos, RSC...) n'est pas interceptee : le
// navigateur la traite exactement comme sans service worker.
const runtimeCaching: RuntimeCaching[] = [
  {
    // Chunks JS/CSS et polices du build : noms hashes, donc immuables. Couvre
    // ceux qui ne sont pas encore dans le precache (nouvelle version deployee
    // alors que l'ancien service worker est toujours actif).
    matcher: isImmutableBuildAsset,
    method: "GET",
    handler: new CacheFirst({
      cacheName: STATIC_CACHE,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: isAppIcon,
    method: "GET",
    handler: new StaleWhileRevalidate({
      cacheName: ICONS_CACHE,
      plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },
  {
    // Navigations : toujours le reseau, jamais de cache. Une page protegee ne
    // peut donc pas etre resservie apres une deconnexion ou un changement de
    // compte, et chaque navigation charge la derniere version deployee. En cas
    // d'echec reseau seulement, la page hors ligne precachee est renvoyee.
    matcher: isAppNavigation,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  cacheId: "incusight",
  // La nouvelle version attend le clic « Mettre a jour » (ServiceWorkerUpdateBanner)
  // ou la fermeture de tous les onglets : on ne remplace pas le code d'une page
  // ouverte, ou un formulaire est peut-etre en cours de saisie.
  skipWaiting: false,
  // Premiere installation : controler tout de suite la page, pour que la page
  // hors ligne soit disponible des la premiere visite.
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_ROUTE,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Supprime les caches d'execution d'anciennes versions de ce service worker.
// Le precache est nettoye par Serwist (cleanupOutdatedCaches).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("incusight-") && !name.includes("-precache-"))
          .filter((name) => !RUNTIME_CACHES.has(name))
          .map((name) => caches.delete(name)),
      ),
    ),
  );
});

serwist.addEventListeners();
