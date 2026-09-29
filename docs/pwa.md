# PWA — IncuSight installable

Livraison du 29 septembre 2026, frontend uniquement. IncuSight est installable
(Android, iOS, desktop Chromium), s'ouvre en fenêtre `standalone`, précache ses
assets statiques et affiche une page hors ligne quand une navigation échoue faute
de réseau. **Aucune donnée métier, aucune page et aucune réponse d'API n'est mise
en cache.**

## 1. Contexte technique qui a guidé les choix

- Next 16.2.1, App Router, **Turbopack par défaut** au build, `output: "standalone"`
  (image Docker `node:24-alpine`).
- Auth : JWT dans `localStorage` (`token`, `refreshToken`), aucune donnée de
  session en cookie, aucun middleware. Pages protégées rendues côté client
  (`RoleGuard`), données chargées depuis l'API NestJS sur **une autre origine**
  (`NEXT_PUBLIC_API_URL`) + socket.io. Le HTML d'une page protégée ne contient
  donc aucune donnée utilisateur.
- `@serwist/next` exige webpack (le guide Next installé le rappelle). On utilise
  **`@serwist/turbopack`** (même version 9.5.12), l'intégration officielle pour
  Turbopack : le service worker est compilé par esbuild dans un route handler
  `force-static`, donc généré au build. Pas de `--webpack`.
- Couleur de thème : `--brand` `#f97316`. La couleur principale d'IncuSight est
  l'orange ; le « bleu » n'existe que comme marine de la sidebar.
- Aucun fichier logo dans le dépôt : la marque est le carré arrondi orange avec
  l'icône Lucide `Rocket` (landing, écrans d'auth). Les icônes sont générées à
  partir de ce tracé exact (`scripts/generate-pwa-icons.mjs`). Le `favicon.ico`
  précédent était le triangle Vercel par défaut ; il est remplacé.

## 2. Fichiers

| Fichier | Rôle |
|---|---|
| `src/app/manifest.ts` | Manifest servi à `/manifest.webmanifest`, lié automatiquement par Next |
| `src/sw.ts` | Service worker (Serwist) : précache, règles runtime, page hors ligne, mises à jour |
| `src/lib/pwa-cache-rules.ts` | Critères des règles de cache, purs et testés |
| `src/lib/pwa.ts` | Constantes (couleurs, URL du SW, route hors ligne) et règles d'installation |
| `src/app/serwist/[path]/route.ts` | Compile et sert `/serwist/sw.js` (statique au build) |
| `src/app/offline/page.tsx` + `src/components/pwa/OfflineRetryButton.tsx` | Page hors ligne |
| `src/components/pwa/PwaProvider.tsx` | Enregistre le SW (production uniquement) et rend les cartes |
| `src/components/pwa/InstallPrompt.tsx` | Installation : `beforeinstallprompt` ou indication iOS |
| `src/components/pwa/ServiceWorkerUpdateBanner.tsx` | Bandeau « Nouvelle version disponible » |
| `src/app/pwa.css` | Styles des cartes (tokens existants) |
| `public/icons/*.png`, `src/app/favicon.ico` | Icônes 192, 512, maskable 512, apple-touch 180, favicon |
| `scripts/generate-pwa-icons.mjs` | Régénère les icônes (`node scripts/generate-pwa-icons.mjs`) |
| `tests/pwa.test.mjs` | 7 tests unitaires (règles de cache, iOS, masquage, manifest) |
| `tests/visual/pwa.mjs` | Recette Chrome de bout en bout sur le build standalone |

Modifiés : `src/app/layout.tsx` (métadonnées iOS, `viewport.themeColor`,
`PwaProvider`), `next.config.ts` (`withSerwist`, en-têtes du SW),
`package.json`.

Dépendances : `@serwist/turbopack@9.5.12` et `serwist@9.5.12` (dependencies),
`esbuild` (devDependency, compile le SW au build — le builder Docker l'installe
via `npm ci`).

## 3. Stratégie de cache

Règle directrice : un contenu n'est mis en cache que s'il est **immuable ou
public, et sans aucune donnée utilisateur**.

| Requête | Stratégie | Justification |
|---|---|---|
| `/_next/static/**` (JS, CSS, polices) | Précache au build + `CacheFirst` (200 entrées, 30 j) | Noms hashés : une nouvelle version produit de nouvelles URL, jamais de contenu périmé |
| `/icons/*`, `/favicon.ico` | Précache + `StaleWhileRevalidate` (7 j) | Public, sans donnée |
| `/offline` | Précache, révision aléatoire par build | Seule page en cache ; statique, sans donnée |
| Navigation vers une page du frontend | `NetworkOnly`, repli sur `/offline` si le réseau échoue | Aucune page, publique ou protégée, n'est resservie depuis le cache |
| Payload RSC (`?_rsc=`, en-tête `RSC`) | Non intercepté | Contenu de page |
| **API NestJS** (autre origine : `/auth`, `/users`, `/application`, `/evaluation`, `/program`, `/notifications`, `/incubation-followups`, `/startup`, `/reports`, `/dashboard`…) | **Non interceptée** | Aucune règle ne capte une autre origine : le navigateur traite ces requêtes exactement comme sans SW |
| socket.io, téléchargements, logos | Non interceptés | Idem |

**Aucun cache d'API n'est proposé.** Toutes les données d'IncuSight sont
authentifiées ou susceptibles de changer à tout moment (statuts de candidature,
décisions, notifications). Même les routes publiques (`program/public`,
`startup/public`) alimentent des décisions de candidature, et les servir périmées
hors ligne afficherait des programmes fermés comme ouverts.

`defaultCache` de Serwist est volontairement **non utilisé** : sa règle
`cross-origin` (NetworkFirst, 1 h) mettrait en cache les réponses de l'API avec
`Authorization`, et ses règles `pages`/`pages-rsc` le HTML des pages protégées.

`SerwistProvider` est configuré avec `cacheOnNavigation={false}` (sinon chaque
URL visitée serait mise en cache) et `reloadOnOnline={false}` (sinon le retour
du réseau rechargerait la page et ferait perdre une saisie).

Précache : 68 entrées, ~2,1 Mo, téléchargées en arrière-plan à la première visite.

## 4. Hors ligne

- Une navigation qui échoue faute de réseau reçoit `/offline` **à l'URL demandée** :
  « IncuSight est temporairement hors ligne », icône, message, bouton « Réessayer ».
- « Réessayer » recharge l'URL d'origine ; la page se recharge aussi seule à
  l'événement `online` (elle n'a pas de formulaire). Visitée directement,
  `/offline` renvoie vers `/`.
- Navigation client hors ligne : Next bascule en navigation complète, donc vers
  la page hors ligne, ou affiche une page déjà préchargée par le routeur, dont
  les appels d'API échouent avec les états d'erreur existants. Aucune donnée
  n'est jamais simulée.
- **API indisponible mais frontend joignable** : ce n'est pas « hors ligne ». Les
  pages se chargent, les erreurs d'API s'affichent comme avant, et la session est
  conservée (`api.ts` ne supprime la session que sur rejet 400/401/403 du refresh).

## 5. Authentification

- Le SW ne voit ni les tokens (`localStorage`) ni les réponses d'auth (autre origine).
- Rien à purger au logout : CacheStorage ne contient que des assets et `/offline`.
  L'IndexedDB `serwist-expiration` ne stocke que des URL d'assets et leurs dates.
- Pas de page protégée périmée, pas de boucle de redirection : chaque navigation
  va au réseau, la logique de session existante (`AuthContext`, `RoleGuard`,
  `AuthSessionRedirect`) est inchangée.

## 6. Mises à jour

- `/serwist/sw.js` est servi avec `Cache-Control: no-cache, no-store,
  must-revalidate` et enregistré avec `updateViaCache: "none"` : chaque contrôle
  de mise à jour relit le fichier.
- Le HTML n'est jamais en cache : **une nouvelle version déployée est servie dès
  la navigation suivante**, même avant l'activation du nouveau SW (vérifié : le
  `BUILD_ID` du nouveau build est dans la page rechargée).
- Le nouveau SW attend (`skipWaiting: false`). Le bandeau « Nouvelle version
  disponible » propose « Mettre à jour » (message `SKIP_WAITING`, puis
  rechargement de cet onglet uniquement) ou « Plus tard ». Sinon, il s'active à la
  fermeture de tous les onglets. On ne remplace pas le SW sous une page où une
  saisie est peut-être en cours.
- Une app installée reste parfois ouverte des jours : `update()` est relancé au
  retour sur l'onglet, au plus une fois par heure.
- À l'activation, `cleanupOutdatedCaches` purge l'ancien précache, et les caches
  runtime `incusight-*` d'anciennes versions sont supprimés.
- `clientsClaim: true` : dès la première visite, la page est contrôlée et la page
  hors ligne disponible.

## 7. Installation

- Chromium (Android, desktop) : `beforeinstallprompt` est intercepté ; une carte
  « Installer IncuSight » propose « Installer » / « Plus tard ».
- iOS/iPadOS (iPadOS détecté via `maxTouchPoints`) : pas de `beforeinstallprompt`,
  la carte indique « Touchez Partager puis “Sur l'écran d'accueil” ».
- Masquée si l'app est installée (`display-mode: standalone` ou
  `navigator.standalone`), après `appinstalled`, et pendant 30 jours après
  fermeture (`localStorage` `incusight:pwa-install-dismissed-at`).
- Les cartes sont en `z-index: 38`, sous l'overlay (39), le tiroir de la sidebar
  (40) et les modales (50 à 100).
- iOS : `apple-mobile-web-app-capable`, titre, `apple-touch-icon` 180 px. Pas
  d'images `apple-touch-startup-image` : iOS affiche un écran blanc au lancement
  (il faudrait une image par taille d'écran). Android génère son splash à partir
  du manifest (nom, `background_color`, icône).

## 8. Sécurité

- Les SW n'existent qu'en contexte sécurisé : **HTTPS obligatoire en production**
  (seul `localhost`/`127.0.0.1` est exempté). À garantir au niveau du reverse
  proxy qui sert l'image Docker.
- Portée `/` : le script est à `/serwist/sw.js`, la réponse porte
  `Service-Worker-Allowed: /`.
- Désactivé en développement ; un SW laissé par un `npm start` sur le même port
  est désinstallé par `PwaProvider` en `next dev`.

## 9. Validation (29/09/2026)

- `npm run lint` : 0 erreur. `npm run build` : réussi (TypeScript compris).
- `npm test` : **325 tests, 0 échec** (318 existants + 7 PWA).
- `node tests/visual/pwa.mjs --redeploy` sur le build standalone, API factice
  locale : **18/18 étapes** — SW actif et contrôleur, manifest sans erreur
  d'installabilité (`Page.getInstallabilityErrors`), contenu de CacheStorage
  (aucune page, aucune réponse d'API), login, refresh, navigation, logout, token
  expiré (refresh transparent puis expiration sans boucle), API indisponible,
  hors ligne (direct, rechargement, navigation client), retour en ligne,
  **second build réel** (bandeau, activation, purge de l'ancienne révision),
  suppression du cache et des SW, iOS (390 px, sans débordement), standalone,
  bouton « Installer », aucune exception JS.
- `tests/visual/incubation-workspace.mjs` sur le build de production : 55 vues
  admin + 15 startup, 0 exception, SW actif.

Non vérifiable sans matériel : l'installation réelle sur un appareil Android et
un iPhone (émulée ici : User-Agent, tactile, `navigator.standalone`). Chrome
n'émulant pas `display-mode`, le masquage standalone est vérifié via
`navigator.standalone`. À faire en recette sur appareils, derrière HTTPS.

## 10. Côté backend (non implémenté, recommandations)

Aucune modification backend n'est nécessaire au fonctionnement de la PWA.
Durcissements recommandés, indépendants du SW :

1. `Cache-Control: no-store` sur les réponses authentifiées et sur `auth/*`.
   Aujourd'hui, seul le logo public porte un `Cache-Control`. Sans SW, le cache
   HTTP du navigateur peut quand même conserver une réponse.
2. HTTPS + HSTS sur l'API en production (le frontend en HTTPS ne peut pas appeler
   une API en HTTP : contenu mixte).
