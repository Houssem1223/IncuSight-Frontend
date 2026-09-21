# Vigilance des startups — côté frontend

> Pendant frontend de `IncuSight-Backend/docs/STARTUP_VIGILANCE.md`, qui reste la
> source de vérité du contrat (routes, barèmes, cache, confidentialité). Ce document
> ne décrit que ce que le frontend en fait. Rédigé le 2026-09-18.

⚠️ **La fonctionnalité ne prédit ni l'échec ni la réussite d'une startup.** Le score
signale *qui* nécessite de l'attention ; l'analyse explique *pourquoi et sur quoi*.
Le vocabulaire « risque d'échec », « startup à risque », « probabilité de réussite »
est proscrit — un test de source le verrouille.

## 1. Où ça vit

| Fichier | Rôle |
|---|---|
| [`src/types/startup-vigilance.ts`](../src/types/startup-vigilance.ts) | Types recopiés du contrat backend, enveloppe paginée comprise |
| [`src/lib/startup-vigilance-api.ts`](../src/lib/startup-vigilance-api.ts) | Les 4 appels, via `apiFetch` ; query string de la liste |
| [`src/lib/startup-vigilance-params.ts`](../src/lib/startup-vigilance-params.ts) | Les 7 filtres + page + tri : défauts, lecture et écriture d'URL, transitions, conversion des filtres du dashboard (pur) |
| [`src/lib/startup-vigilance-query.ts`](../src/lib/startup-vigilance-query.ts) | Options TanStack partagées, clés de cache, invalidations |
| [`src/lib/startup-vigilance-view.ts`](../src/lib/startup-vigilance-view.ts) | Règles d'affichage pures (testées) |
| [`src/hooks/useStartupVigilance.ts`](../src/hooks/useStartupVigilance.ts) | 2 queries + 2 mutations |
| [`src/hooks/useVigilanceListParams.ts`](../src/hooks/useVigilanceListParams.ts) | Branche les filtres sur `useSearchParams` / historique natif intégré à Next |
| [`src/hooks/useSelectedFollowUp.ts`](../src/hooks/useSelectedFollowUp.ts) | `?followUp=` comme unique source de vérité de la sélection master-detail |
| [`src/components/dashboard/admin/vigilance/`](../src/components/dashboard/admin/vigilance/) | 12 composants (liste, filtres, pagination, score, facteurs, analyse IA, sources) |
| [`tests/startup-vigilance.test.mjs`](../tests/startup-vigilance.test.mjs) | 36 tests de règles, de client API et d'invariants |
| [`tests/startup-vigilance-list.test.mjs`](../tests/startup-vigilance-list.test.mjs) | 33 tests de paramètres, de clés de cache et de transitions |
| [`tests/startup-vigilance-render.test.mjs`](../tests/startup-vigilance-render.test.mjs) | 33 tests de rendu React serveur |
| [`tests/dom/`](../tests/dom/) | 15 tests d'**interaction réelle** (jsdom + Testing Library) : clics, Select, Précédent/Suivant du navigateur |

**Emplacements dans l'UI** — l'aperçu et le workspace partagent les hooks,
paramètres serveur, filtres et pagination :

1. `/dashboard/admin` — `variant="top"`, en bas de
   [`AdminDashboardOverview`](../src/components/dashboard/admin/AdminDashboardOverview.tsx) :
   les **cinq** premiers suivis (page 1, limite 5, `score_desc`), sans filtre ni
   pagination, chaque ligne pointant vers `…/incubation-followups?followUp=<id>`
   et un lien « Voir tous les suivis » vers l'écran complet, sans paramètres.
   `toVigilanceTopParams` y reporte les filtres globaux du dashboard que cette
   route accepte : `programId`, `period` et, sous `custom`, `from`/`to`.
2. `/dashboard/admin/incubation-followups` — `IncubationStartupSidebar` présente
   la même enveloppe serveur en liste compacte. Recherche visible, autres filtres
   sous « Filtres et tri ». La sélection reste portée par `?followUp=` et ne
   change pas quand la liste est filtrée. Le tableau de classement n'est plus
   monté au-dessus de la liste : voir [incubation-workspace.md](incubation-workspace.md).

Le **détail** (`StartupVigilancePanel`) vit dans l'onglet `tab=vigilance`. Le
workspace garde une query de détail observée pour le score du header et la
synthèse. Le panneau utilise ce cache avec `sharedDetail` : changer d'onglet ne
relance pas un GET. Les mutations, invalidations et règles IA restent identiques.
Les points d'avancement et objectifs déjà chargés permettent de nommer les sources
sans requête supplémentaire. Les sous-sections IA et détails du journal se déplient
à la demande.

## 2. Contrat consommé

Quatre routes, toutes `@Roles(ADMIN)` côté backend :

| Appel | Route | Effet |
|---|---|---|
| `getStartupVigilanceList` | `GET admin/startup-vigilance` | Une **page** des suivis **ACTIVE**, filtrée, triée et découpée par le serveur, **une seule requête**, aucun LLM |
| `getStartupVigilance` | `GET admin/startup-vigilance/:followUpId` | Score courant + cache IA valide, **jamais de génération** |
| `analyzeStartupVigilance` | `POST …/analyze` | Génère si nécessaire, sinon sert le cache |
| `refreshStartupVigilanceAnalysis` | `POST …/refresh` | Régénération explicite |

Le frontend ne parle **jamais** à Groq/Mistral/Ollama : aucune clé, aucun appel
direct. Chemin réel :
`Next.js → NestJS → StartupVigilanceService → AiService → providers`.

### Paramètres de la liste

Onze clés, toutes facultatives, recopiées de `StartupVigilanceListQueryDto` :

| Clé | Valeurs | Absente ⇒ |
|---|---|---|
| `search` | nom de startup, ≤ 200 car., trimé, insensible à la casse | aucun filtre |
| `programId` | CUID | aucun filtre |
| `status` | `ACTIVE` / `COMPLETED` / `SUSPENDED` / `DROPPED` | **`ACTIVE`** |
| `phase` | `ONBOARDING` … `CLOSING` | aucun filtre |
| `level` | `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` | aucun filtre |
| `period` | `7d` / `30d` / `3m` / `1y` / `custom` — cohorte par `startDate` | aucune restriction temporelle |
| `from` / `to` | ISO 8601, **obligatoires** sous `custom`, `from < to` | — |
| `page` / `limit` / `sort` | `limit` ≤ 100 | 1 / 20 / `score_desc` |

Trois pièges de ce DTO, vérifiés dans le code backend :

1. **`status` absent ne veut pas dire « tous les statuts »** : le service fait
   `status ?? ACTIVE`. Il n'existe aucune valeur pour demander les quatre — d'où
   l'absence volontaire d'une option « Tous les statuts » dans le Select, qui
   mentirait. Le frontend envoie donc toujours le statut explicitement.
2. **Les chaînes vides sont rejetées** (`status=''`, `period=''`, `programId=''`
   → 400), pas seulement les clés inconnues. `buildStartupVigilanceListQuery`
   traduit toute valeur vide en clé absente.
3. **`period=custom` sans ses deux bornes est un 400.**
   `toVigilanceListQuery` n'envoie alors ni `period` ni `from`/`to` : pendant la
   saisie des dates, la liste reste sur le périmètre complet plutôt que de casser.

⚠️ **`level` est appliqué par le serveur avant la pagination**, sur le classement
complet : `totalItems` en tient compte. C'est un vrai filtre global.

La réponse est une **enveloppe** :

```
{ items: StartupVigilanceListItem[], pagination: { page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage } }
```

C'est le premier endpoint du projet à en renvoyer une — les autres listes
paginées passent leur total par l'en-tête `X-Total-Count` (`ApiResult`). Il n'y
avait donc aucun type d'enveloppe à réutiliser.

### Écarts par rapport à une lecture naïve du contrat

Cinq pièges vérifiés dans le code backend, pas devinés :

0. **`totalItems` est le total serveur**, tous filtres appliqués — `items.length`
   ne compte que la page. Rien dans l'écran ne dérive un total d'une page, et un
   test l'interdit (même piège que le compteur de notifications non lues).
1. **La liste porte les 5 facteurs complets**, pas un résumé — `VigilanceResponseDto`
   étend `VigilanceDashboardItemDto`. Le détail n'ajoute que `aiAnalysis`, `ai`,
   `evidenceSources` et `meta`.
2. **Chaque facteur** porte `applicable` **et** `dataSufficient`, pas seulement la
   stagnation. Un facteur à zéro pour cause de données manquantes ne doit jamais se
   lire « tout va bien » — d'où la phrase métier de chaque ligne.
3. **`progress` de la réponse vaut `factors.progress.averageProgress`**, nullable —
   c'est la progression *représentative retenue par le scoring*, pas
   `IncubationFollowUp.progress`. Elle s'affiche « Progression non disponible »
   quand elle est nulle.
4. **L'état de l'IA est un objet à 7 statuts**, pas un simple `aiAnalysis | null` :
   `READY`, `NOT_GENERATED`, `STALE`, `INSUFFICIENT_DATA`, `NOT_APPLICABLE`,
   `UNAVAILABLE`, `INPUT_CHANGED`. `getVigilanceAiState` les traduit en intention
   d'affichage (afficher ? quel bouton ? quel message ? état dégradé ?).

## 3. Décisions prises

- **Un seul composant de liste pour les deux emplacements**, avec une prop
  `variant` (`top` / `list`) — pas deux copies. `onSelectFollowUp`
  absent → lien `next/link` vers l'écran de suivi ; présent → sélection en place.
  Le drill-down par `?followUp=` reprend le pattern déjà utilisé par
  `AdminApplicationsManagement`. Le tableau, ses colonnes et ses lignes sont
  strictement les mêmes des deux côtés ; seuls l'en-tête, les contrôles et le
  lien de pied diffèrent.
- **Les sept filtres et le tri sont serveur ; il n'existe aucun `items.filter`
  ni `items.sort` dans l'écran** — un test de source l'interdit. `sortVigilanceItems`,
  `getVisibleVigilanceItems` puis `filterVigilanceItems` ont tous été supprimés
  au fur et à mesure que le backend a pris ces filtres : filtrer ou retrier après
  découpage ne montrerait que les correspondances de la page et fausserait
  `totalItems` (piège 7 de
  [`backlog-execution-2026-09.md`](backlog-execution-2026-09.md)).
- **L'URL est l'unique source de vérité**, pour les filtres
  (`useVigilanceListParams`) comme pour la sélection du master-detail
  (`useSelectedFollowUp`). Aucun `useState` ne la double : il n'y a donc ni
  désynchronisation, ni boucle `state → replace → effect → state`, et le
  **retour arrière du navigateur fonctionne sans effet de synchronisation** —
  `useSearchParams` change, le composant se re-rend, TanStack Query relit la clé
  correspondante.
- **`push`, et non `replace`, pour les actions de l'administrateur.** Avec
  `replace`, « Programme A → Programme B → Retour » ne reviendrait pas à A, faute
  d'entrée d'historique. Seules les corrections **automatiques** (page hors
  limites) utilisent `replace`, pour ne pas semer des entrées sur lesquelles
  Retour rebondirait. Réécrire une URL identique est ignoré, sinon Retour
  semblerait ne rien faire.
- **La recherche est débouncée à 300 ms** — le dépôt n'avait pas de debounce à
  réutiliser. Sans elle, « HealthFlow » ferait dix requêtes *et* dix entrées
  d'historique. Le champ suit la frappe immédiatement ; c'est la navigation qui
  attend. Le recalage du champ sur l'URL (Retour, reset) se fait par ajustement
  **pendant le rendu**, le motif documenté par React — `useEffect` + `setState`
  est refusé par `react-hooks/set-state-in-effect`.
- **Changer un filtre ou le tri remet la page à 1.** Rester en page 4 d'un
  autre filtre afficherait une page vide : le backend conserve volontairement la
  page demandée. Si le cas survient quand même, `getOutOfRangeVigilancePage`
  ramène à la page 1 — qui existe dès que `totalPages >= 1`, donc sans boucle de
  requêtes possible, et la correction est ignorée si on y est déjà.
- **Les programmes du Select viennent de `ProgramContext`**, la source déjà
  utilisée par `DashboardFilterBar` — aucune route dédiée n'a été créée. Le
  classement ne cite que les programmes ayant un suivi actif, ce qui ne suffit
  pas à peupler un filtre. Son chargement échoue en silence : le Select retombe
  sur « Tous les programmes » plutôt que de faire échouer l'écran.
- **`placeholderData: keepPreviousData`** (pattern v5) : au changement de page ou
  de filtre, la page précédente reste affichée, atténuée, au lieu d'un écran
  blanc entre deux requêtes.
- **Le bouton « Réinitialiser les filtres » n'apparaît qu'avec un état non par
  défaut**, tri compris, et un compteur « Filtres (3) » annonce les filtres
  métier actifs (le tri n'en est pas un). Le reset **préserve `followUp`** : la
  colonne de détail ne dépend pas du classement, la désélectionner serait une
  perte gratuite. Il empile une entrée d'historique, donc s'annule d'un Retour.
- **L'aperçu du dashboard suit les filtres globaux que cette route accepte.**
  `toVigilanceTopParams` reporte `programId`, `period` et `from`/`to`, et
  **laisse `status` de côté** : le filtre global porte un statut de *candidature*
  (`PENDING`/`ACCEPTED`/`REJECTED`), la vigilance un statut d'*incubation*
  (`ACTIVE`/`COMPLETED`/…) — les deux enums n'ont aucune valeur commune et le
  transmettre serait un 400. Conséquence assumée : le dashboard ayant un défaut à
  30 jours, l'aperçu montre la **cohorte des suivis démarrés sur la période**,
  comme les cartes d'incubation juste au-dessus, et non tout l'historique.
- **La sélection depuis la liste remet le filtre de statut à « Tous » et vide la
  recherche.** Le classement ne liste que les suivis actifs : sans cela, un filtre
  en cours pourrait exclure le dossier demandé, et l'écran retomberait
  silencieusement sur le premier de sa liste filtrée.
- **`analyze` partout sauf sur une analyse encore valide.** Le backend régénère de
  lui-même un cache périmé ; `refresh` (payant, forcé) n'est utile que pour
  remplacer un `READY`. C'est `needsForcedRefresh` qui tranche.
- **Pas de retry automatique sur les mutations** (`retry: false`) : chaque tentative
  consomme du quota. Les queries gardent un retry, sauf sur 403/404.
- **`setQueryData` sur le détail + invalidation de la liste** après une analyse : la
  réponse du POST *est* le détail à jour, mais elle recalcule aussi le score, et les
  autres lignes ont pu bouger. Le GET de liste est déterministe et sans LLM.
- **Le score est invalidé quand le suivi change.** Objectif créé/modifié ou statut
  changé → `invalidateStartupVigilance`. Sans cela, l'écran afficherait un indicateur
  périmé juste à côté des données qui viennent de changer.
- **`provider`, `model`, `fromCache`, `errorCode` ne sont jamais affichés** : détails
  techniques. Un test de rendu vérifie que le nom du fournisseur n'atteint pas le DOM.
- **Aucune statistique n'est recalculée.** Il n'existe volontairement aucune fonction
  `calculateVigilanceScore` / `calculateStagnation` ; un test de source l'interdit.

### ⚠️ Clés de cache

Les deux familles se distinguent par leur **deuxième segment** :

| Clé | Forme |
|---|---|
| Une page du classement | `["startup-vigilance", "list", { programId, page, limit, sort }]` |
| Un détail | `["startup-vigilance", "<followUpId>"]` |

**Les onze paramètres** font partie de la clé — `search`, `programId`, `status`,
`phase`, `level`, `period`, `from`, `to`, `page`, `limit`, `sort` : sans eux, la
page 2 du programme A écraserait dans le cache la page 1 du programme B. Une clé
absente et une clé `undefined` désignent la même entrée (le hachage de TanStack
ignore `undefined`), ce qui rend `status: "ACTIVE"`, toujours envoyé, non
ambigu.

L'invalidation de la liste vise le préfixe `["startup-vigilance", "list"]` — donc
**toutes** les pages et tous les filtres d'un coup, sans emporter les détails.
C'est ce que corrige le second segment : l'ancienne clé, `["startup-vigilance"]`,
était un préfixe des détails et imposait `exact: true`, ce qui laissait par
ailleurs les autres pages périmées. Les helpers du module s'en chargent — ne pas
les court-circuiter.

## 4. États couverts

| Situation | Rendu |
|---|---|
| `totalItems === 0`, aucun filtre | « Aucune startup n'est actuellement en suivi d'incubation. » |
| `totalItems === 0`, programme seul | « Aucune startup en suivi d'incubation pour ce programme. » |
| `totalItems === 0`, plusieurs filtres | « Aucune startup ne correspond aux critères sélectionnés. » |
| `totalItems === 0`, avec une recherche | « Aucune startup trouvée pour « … ». » — la recherche prime sur les autres formulations, c'est la dernière chose tapée |
| Page au-delà du dernier rang | « Cette page ne contient aucun suivi. », puis retour automatique en page 1 |
| Aperçu sans niveau élevé ni critique | `role="status"` + « Aucune startup ne présente actuellement un niveau de vigilance élevé. » — **les lignes et les scores restent affichés**, seule la présentation cesse d'être une alerte |
| Liste en erreur | `role="alert"` + « Impossible de charger la liste de vigilance. » + « Réessayer le chargement », jamais un faux état vide |
| Aperçu en erreur | Même traitement, formulé « Impossible de charger les indicateurs de vigilance. » |
| Changement de page ou de filtre | La page précédente reste affichée, atténuée (`opacity-60`), jamais un écran blanc |
| Facteur sans dénominateur | « Aucun objectif actif avec échéance. », barre grisée |
| Stagnation non mesurable | « Données insuffisantes pour mesurer la tendance récente. » |
| Progression non mesurable | « Progression non disponible » |
| Aucune analyse IA | « Aucune analyse intelligente n'a encore été générée. » + « Générer l'analyse » |
| Analyse périmée / concurrente | Message dédié + « Actualiser » / « Relancer » |
| Pas de point d'avancement | Explication, **aucun bouton** — le backend n'appellerait pas le modèle |
| Suivi non actif | « Seul l'indicateur quantitatif reste consultable », aucun bouton |
| IA indisponible | Bandeau ambre, **score et facteurs intacts** — le backend répond 200 |
| Suivi introuvable / interdit | Message métier (404 / 403), jamais l'erreur technique |

Pendant une génération, l'analyse précédente reste affichée et seul le bouton est
désactivé ; le score n'est jamais masqué.

Accessibilité : niveau, récurrence, sévérité et priorité sont **toujours écrits en
toutes lettres**, la couleur n'étant qu'un renfort ; le tableau défile
horizontalement dans son conteneur plutôt que de déborder ; `aria-busy`,
`role="status"` et `role="alert"` distinguent attente et erreur. Les **sept
champs de filtre** portent un `<label>` lié par `htmlFor` (`FormField`) — un test
de rendu le vérifie champ par champ —, le bouton de reset est un vrai `<button>`,
les boutons de pagination ont un `disabled` réel piloté par `hasPreviousPage` /
`hasNextPage` — jamais un simple style — et le bloc est dans un `<nav aria-label>`.
Au mobile, les filtres passent en une colonne (`grid` → `sm:grid-cols-2` →
`xl:grid-cols-4`) et la pagination se replie (`flex-wrap`).

## 5. Sources (`evidenceRefs`)

Le modèle ne renvoie que des références temporaires (`U2`, `O1`). Le backend joint
`evidenceSources: [{ ref, kind, id }]` avec les **vrais identifiants**, et l'écran a
déjà les points d'avancement et objectifs en mémoire : `resolveEvidenceRefs` produit
donc « Mise à jour du 15/09/2026 » ou « Objectif « Signer 3 pilotes » », et le
contenu (réalisé / blocages / besoins / prochaines étapes) est consultable dans un
`<details>` sans quitter la page.

Une référence non résolvable **n'est jamais affichée brute ni inventée** : elle est
comptée, et rendue « Basé sur 2 éléments du suivi. » C'est ce qui se produit quand le
panneau est affiché sans que le suivi complet soit chargé.

## 6. Tests

`npm test` — 117 tests sur quatre fichiers. Le script porte deux drapeaux :
`--experimental-loader ./tests/typescript-loader.mjs` (TS/TSX, alias `@/`) et
`--experimental-test-module-mocks` (substitution de `next/navigation`).

Le dépôt n'avait **aucune stack de test DOM** : ni Testing Library, ni jsdom, ni
Playwright, ni Cypress. Deux devDependencies ont été ajoutées, `jsdom` et
`@testing-library/react`, et rien d'autre.

- **Règles** (`startup-vigilance.test.mjs`, 36 tests) — niveaux,
  facteurs et leurs cas dégradés, états IA, catégories, sources, erreurs, routes
  réellement appelées (une seule requête par page, `analyze`/`refresh` ciblés).
- **Liste** (`startup-vigilance-list.test.mjs`, 33 tests) — les onze paramètres
  transmis un par un puis ensemble, lecture de l'enveloppe, 18 clés de cache
  toutes distinctes, retour en page 1 pour chacun des sept filtres, `period=custom`
  incomplet, page hors limites, lecture et écriture d'URL, reset, conversion des
  filtres du dashboard, formulations d'état vide et d'erreur, progression retenue
  par le scoring.
- **Rendu** (`startup-vigilance-render.test.mjs`, 33 tests) — rendu serveur React
  avec un vrai `QueryClient` préchargé, comme `ai-analysis-render.test.mjs` : les
  deux variantes, les trois Select, la pagination et ses boutons désactivés, les
  états vides, et un test de **non-retour à l'ancien contrat** (un tableau brut en
  cache ne rend plus aucune ligne).
- **Interaction réelle** (`tests/dom/vigilance-filters.dom.test.mjs`, 15 tests) —
  composants montés dans jsdom, `fireEvent` sur les vrais Select et boutons :
  chaque filtre jusqu'à la query string envoyée, retour en page 1, debounce de la
  recherche (cinq frappes → une requête), pagination cliquée, reset complet,
  et **Précédent/Suivant du navigateur** sur les filtres comme sur `followUp`.
  Un test vérifie qu'une réponse volontairement incohérente (une ligne `LOW`
  renvoyée pour `level=HIGH`) est affichée **telle quelle** : la preuve qu'aucun
  filtre local ne subsiste.
- **Invariants de source** — montage uniquement sous `RoleGuard allowedRole="ADMIN"`,
  absence de recalcul de score, absence de refiltrage ou de retri de la page,
  absence de tout `analyze`/`refresh` atteignable depuis le classement, absence de
  miroir local de `followUp`, enums de filtre importés de `followupHelpers` plutôt
  que recopiés, absence de bouton d'application automatique, absence du vocabulaire
  prédictif (commentaires exclus du filtre : ils citent justement les termes
  interdits).

### ⚠️ Pièges du harnais DOM

- **`next/navigation` est remplacé par un routeur adossé à la vraie
  `window.history` de jsdom**, pas par un faux état : `back()` et `forward()`
  sont de véritables navigations. `useSyncExternalStore` y renvoie une *chaîne*
  (la query string), pas un `URLSearchParams` — un objet neuf à chaque lecture
  ferait boucler le store en « getSnapshot should be cached ».
- **`new Event()` du global Node est refusé par `dispatchEvent` de jsdom** :
  il faut `new window.Event()`.
- **Ne pas conclure d'une absence d'appel réseau.** Avec `staleTime: 60_000`,
  revenir en arrière ressert la clé depuis le cache *sans* refetch — ce qui est
  correct. Les tests assertent donc sur la **queryKey observée** (`activeQuery()`),
  pas sur la dernière requête HTTP.

⚠️ La clé de cache d'un test de rendu est construite avec `toVigilanceListQuery`,
comme dans le composant : si celui-ci demandait d'autres paramètres, il ne
trouverait rien en cache et le rendu serait vide — le test échouerait.

Deux ajustements du loader de tests partagé ont été nécessaires, tous deux des
capacités que le bundler Next fournit et que l'ESM de Node n'a pas :
résolution de `next/<sous-chemin>` vers son `.js`, et résolution d'un dossier vers
son `index.ts(x)` (les barils comme `@/src/components/ui/forms`).

## 7. Limites connues

- **Les permissions backend restent hors des tests frontend.** Le montage sous
  `RoleGuard ADMIN` est contrôlé en source et le nouveau test DOM du workspace
  vérifie le refus de rendu pour un EVALUATOR. La garde backend reste
  `@Roles(Role.ADMIN)` sur les 4 routes.
- **Il n'existe aucun « tous les statuts ».** Le backend faisant `status ?? ACTIVE`,
  la route ne sait pas renvoyer les quatre statuts à la fois. Le Select propose
  donc quatre choix exclusifs, `ACTIVE` par défaut.
- **Le statut du filtre global du dashboard ne traverse pas** vers l'aperçu :
  enums incompatibles (candidature vs incubation). Il faudrait un paramètre
  backend distinct pour que cela ait un sens.
- **La recherche ne porte que sur le nom de la startup** (`startupName`, `contains`
  insensible à la casse côté serveur) — ni programme, ni identifiant. La recherche
  locale de l'ancienne seconde liste `FollowUpsList` a été supprimée avec cette
  liste. Le programme se choisit désormais dans le filtre dédié de la sidebar.
- **Les tests DOM n'ouvrent pas un vrai navigateur.** jsdom couvre les événements,
  le focus et l'historique, mais ni la mise en page, ni le CSS, ni le rendu
  responsive. Le script distinct `tests/visual/incubation-workspace.mjs` ouvre
  Chrome sur le build avec des fixtures pour contrôler ces aspects.
- **La génération est synchrone** : l'appel HTTP attend la réponse du fournisseur (ni
  streaming ni tâche de fond côté backend). Avec plusieurs providers et des retries,
  l'attente peut être longue — le timeout du reverse proxy doit suivre.
- **`ai.message` du backend n'est pas affiché tel quel** : le frontend a ses propres
  formulations pour les 7 statuts. Un huitième statut devra être traité dans
  `getVigilanceAiState`, dont le `default` retombe aujourd'hui sur « non générée ».
