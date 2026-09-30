# Adaptation mobile — audit et corrections

Livraison du 30 septembre 2026, frontend uniquement. Objectif : une expérience
réellement utilisable au doigt de 320 à 430 px, sans changer les fonctionnalités
ni le rendu desktop. Complète [`dashboard-ux-polish.md`](dashboard-ux-polish.md)
(sidebar/tiroir) et [`pwa.md`](pwa.md).

## 1. Méthode et outillage

Tout est mesuré sur le **build de production** (`standalone`), avec une **API
factice** déterministe : aucun backend réel n'est contacté (un backend de
développement tournait sur 8050 ; l'audit utilise 8051).

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8051 npm run build
node tests/visual/responsive/audit.mjs [filtre] [--no-shots]   # ~10 min
node tests/visual/responsive/scenarios.mjs [filtre]            # ~2 min
npm run build                                                  # rebuild normal ensuite
```

| Fichier | Rôle |
|---|---|
| `tests/visual/responsive/api-mock.mjs` | API NestJS factice, rôle porté par le token (`tok-admin`, `tok-evaluator`, `tok-startup`, `tok-startup-new`). Données volontairement longues (noms, URL, fichiers) pour révéler les débordements |
| `tests/visual/responsive/routes.mjs` | Les 39 fenêtres : 9 publiques, 16 ADMIN, 5 EVALUATOR, 9 STARTUP (avec et sans incubation) |
| `tests/visual/responsive/audit.mjs` | Chaque fenêtre à 320, 360, 375, 390, 412, 430, 768, 1280 et 1440 px (351 mesures) + captures pleine page à 320/360/390/768/1440 |
| `tests/visual/responsive/measure.mjs` | Mesures dans la page (voir §2) |
| `tests/visual/responsive/scenarios.mjs` | 21 états interactifs pilotés au doigt, à 390 et 320 px : tiroirs des 3 rôles, compte, menu et détail des notifications, toutes les modales, formulaires, carte PWA sous le tiroir |
| `tests/visual/responsive/cdp.mjs` | Pilotage Chrome sans dépendance |

Mesures : débordement de page ; éléments hors écran non contenus dans un
défilement contrôlé ; **contenu rogné** par un parent `overflow: hidden` ; texte
qui déborde de sa boîte ; cibles tactiles < 24 px et 24–40 px ; texte < 12 px ;
défilements horizontaux internes ; exceptions JS ; données non chargées. Pour
chaque couche ouverte : tient dans l'écran, bouton de fermeture visible, taille,
défilement interne.

⚠️ Un débordement de **texte** n'agrandit pas la boîte de l'élément :
`getBoundingClientRect` ne le voit pas. C'est ce qui masquait la cause du
débordement de la landing ; `measure.mjs` le détecte désormais.

## 2. Décisions transverses

- **Cause racine n°1 : `min-width: auto` des éléments de grille.** Une grille à
  colonne implicite (`grid gap-3`) prend la largeur minimale de son plus long
  contenu insécable (option d'un `<select>`, URL, nom de fichier), puis
  `dashboard-surface` (`overflow: hidden`) coupe le surplus : cartes rognées,
  bouton « Affecter » ou « Supprimer » amputé. Correction dans
  `src/app/responsive.css` : `.dashboard-page .grid > * { min-width: 0 }` et
  `overflow-wrap: break-word` (qui, contrairement à `anywhere`, ne change pas la
  largeur minimale : colonnes desktop inchangées). Les noms de fichier, sans
  espace, reçoivent `[overflow-wrap:anywhere]` au cas par cas.
- **Règles génériques en `@layer components`** : un utilitaire Tailwind
  explicite garde toujours la priorité. Deux règles seulement sont hors couche
  car elles doivent battre `text-sm`/`p-6` : police 16 px des champs sous
  768 px (Safari iOS zoome sinon au focus) et padding 16 px des surfaces.
- **Cible tactile : 40 px minimum** sous 768 px, pour les boutons du header,
  la fermeture du tiroir et des modales, `.dashboard-btn`, les boutons
  `size="sm"`, les champs, `<summary>`, les liens isolés. Sur desktop, aucune
  taille ne change.
- **Tableaux → cartes sous 768 px** (option A), en CSS : classe `rtable` +
  `data-label` sur chaque cellule, même markup. Au-delà de 768 px, le tableau
  et son défilement horizontal restent tels quels.

| Tableau | Stratégie mobile | Justification |
|---|---|---|
| Candidatures (admin) | Cartes ; ligne de décision rattachée à la carte (`rtable-sub`) | Statut et actions (décider, réviser, PDF) étaient hors vue |
| Programmes | Cartes, description limitée à 3 lignes | Description longue ; actions et évaluateurs du programme hors vue |
| Utilisateurs | Cartes | Rôle, statut compte/email et actions hors vue |
| Startups (admin) | Cartes, liens en pastilles de 40 px | 6 colonnes, dont liens et propriétaire |
| Évaluations d'une candidature | Cartes, libellé « Action » seulement si l'action existe | Statut et score hors vue |
| Vigilance (top 5 du dashboard) | Cartes | Niveau de vigilance et action « Voir le suivi » hors vue |

## 3. Problèmes et corrections

Gravité : **C** critique (contenu inaccessible), **M** majeure, **m** mineure.
Chemins relatifs à `src/`. Validation : `audit.mjs` et `scenarios.mjs` (§4).

| Page | Problème | G. | Cause | Correction | Fichier(s) |
|---|---|---|---|---|---|
| Affectation évaluateurs | Cartes rognées : « Affecter », statuts, titres coupés | C | Grille implicite + `<select>` à option longue | `min-width: 0` sur les éléments de grille | `app/responsive.css` |
| Reviews évaluateur | Formulaire de 508 px dans 390, textes coupés | C | Idem, URL et nom du deck | Idem + coupure du nom de fichier | `app/responsive.css`, `evaluateur/EvaluatorReviewsManagement.tsx` |
| Mes startups | Nom du pitch deck, champs fichier et « Supprimer » rognés | C | Idem | Idem | `app/responsive.css`, `startup/StartupManagement.tsx` |
| Vitrine `/startups` | Cartes de 519 px, page de 223 px trop large | C | Carte en `min-width: auto`, nom tronqué | `min-w-0` sur la carte | `showcase/ShowcaseGrid.tsx` |
| Suivi d'incubation (admin) | Contexte fixe = 470 px sur 568 : ~100 px de contenu | C | `.inc-context` sticky à toutes tailles | Sous 768 px (ou 640 px de haut), l'en-tête défile et seule la barre d'onglets (43 px) reste collée, via `display: contents` sur le contexte : ~450 px de contenu, changement d'onglet sans remonter | `app/incubation-workspace.css` |
| Journal d'incubation | Page 112 px trop large | M | `1fr` = `minmax(auto,1fr)` + nom de livrable insécable | `minmax(0,1fr)`, coupure du nom | `app/incubation-workspace.css`, `admin/followups/UpdatesTimeline.tsx` |
| Dashboard / suivi startup | Livrables joints rognés | M | Nom de fichier insécable | Coupure du nom, bouton `max-w-full` | `startup/StartupIncubationFollowupsInteractive.tsx` |
| Candidatures, programmes, utilisateurs, startups, évaluations, vigilance | Tableaux inutilisables (statut, actions hors vue) | M | Tableau à 6 colonnes dans 300 px | Cartes `rtable` (§2) | 6 composants de tableau + `app/responsive.css` |
| Tous formulaires | Zoom automatique d'iOS au focus | M | Champs en 14 px | 16 px sous 768 px | `app/responsive.css` |
| Menu des notifications (header) | Chaque notification sur 40 px de large, un mot par ligne | M | Sélecteur descendant `.app-header-actions button` (défaut antérieur, déjà à 34 px) | Sélecteur limité aux boutons d'icône | `app/dashboard-shell.css` |
| Landing / connexion / inscription | Page 18 px trop large à 320 | M | 3 cartes « Mission » de 73 px, texte débordant | 1 colonne sous 640 px | `landing/MissionSection.tsx` |
| Landing | Aucune navigation sous 768 px | M | `hidden md:flex` sans alternative | Menu mobile (rubriques + « Se connecter ») | `landing/LandingHeader.tsx`, `landing/LandingMobileMenu.tsx` |
| Toutes | 592 cibles < 24 px (fermer, retirer « x » 16 px, « Voir tout », liens, `summary`…) | M | Tailles desktop | 40 px sous 768 px (§2) | `app/dashboard-shell.css`, `app/responsive.css`, `ui/button.tsx`, `ui/forms/FormModal.tsx`, `dashboard/ConfirmDialog.tsx`, composants concernés |
| Modales | « x » de 30 px qui disparaît en faisant défiler | M | En-tête dans la zone défilante | En-tête collant, bouton 40 px | `ui/forms/FormModal.tsx`, `dashboard/ConfirmDialog.tsx` |
| Détail d'une notification | Message long illisible (pas de défilement) | M | `fixed` + `min-h-screen` sans `overflow` | Conteneur défilant, `min-h-full` | `dashboard/Header.tsx` *(modal supprimée le 30/09/2026, voir [`notifications-frontend.md`](notifications-frontend.md))* |
| Dashboard admin | Dates de l'axe X superposées | M | Intervalle fixe calculé pour le desktop | `preserveStartEnd` + `minTickGap` sous 640 px seulement | `admin/dashboard/TimeseriesCard.tsx`, `hooks/useIsNarrowScreen.ts` |
| Dashboard admin | Donut + légende débordent à 320 | m | Ligne flex non repliable | Colonne sous 640 px | `admin/dashboard/DecisionsDonut.tsx` |
| Dashboard admin | 4 actions rapides empilées (440 px) | m | 1 colonne | 2 colonnes compactes | `admin/dashboard/QuickActionsBar.tsx` |
| Dashboard évaluateur | Échéances et retards à ~1 200 px de défilement | M | 7 tuiles en 1 colonne avant les échéances | Tuiles en 2 colonnes, échéances remontées sous 768 px | `evaluateur/EvaluatorDashboardOverview.tsx` |
| Dashboards et listes (reviews, affectations, synthèse, startup, suivi, mes startups) | Tuiles de statistiques empilées | m | 1 colonne sous 640 px | 2 colonnes | 7 composants |
| Header (STARTUP, EVALUATOR, profil admin) | Titre « Tableau de bord » sur toutes les pages | m | Table codée en dur, sans repli | Libellé de la rubrique de navigation du rôle | `dashboard/Header.tsx` |
| Suivi d'incubation | Nom coupé en plein mot (« Environnement ales ») | m | Nom et progression côte à côte | Empilés sous 600 px | `app/incubation-workspace.css` |
| Tiroir | Fermer en 28×32 ; 272 px sur 320 | m | Tailles fixes | 40×40 ; largeur `min(272px, 100vw − 48px)` | `app/dashboard-shell.css` |
| Surfaces | 245 px utiles sur 320 | m | Page 12 px + surface 24 px | Surface 16 px sous 768 px | `app/responsive.css` |
| Landing | Titre du hero sur 6 lignes, statistiques serrées | m | `text-4xl`, `gap-8` | `text-3xl` puis `sm:text-4xl`, `gap-4` | `landing/HeroSection.tsx` |

## 4. Résultats

Mesures mobiles (39 fenêtres × 6 largeurs = 234) :

| | Avant | Après |
|---|---|---|
| Fenêtres qui débordent | 21 | **0** |
| Éléments hors écran | 43 | **0** |
| Contenu rogné | 5 écrans (constat visuel, mesure ajoutée ensuite) | **0** |
| Cibles < 24 px | 592 | **0** |
| Cibles 24–40 px | 2 294 | 148 (30 à 36 px : liens et pastilles secondaires) |
| Exceptions JS / écrans non chargés | 0 / 0 | 0 / 0 |
| Débordement à 768, 1280, 1440 px | 0 | 0 |
| Texte < 12 px | 1 068 | 1 038 (sur-titres et badges 11 px, voir §5) |

Non-régression desktop : comparaison pixel à pixel des captures avant/après à
768 px (aucun écart > 0,5 %) et 1440 px (seuls changent l'horloge et le titre
du header, désormais juste). Les captures pleine page (`captureBeyondViewport`)
peuvent saisir la transition de 200 ms de la sidebar : comparer des captures
d'écran simples après stabilisation. `tests/visual/incubation-workspace.mjs` :
55 vues admin + 15 startup, 0 exception.

Scénarios : 21/21 couches ouvertes, toutes dans la largeur de l'écran, bouton
de fermeture visible (40×40), carte PWA recouverte par le tiroir.

## 5. Non traité, volontairement

- **Texte à 11 px** des sur-titres en capitales et des badges : choix
  typographique de la charte, conservé. Seuls les libellés à 10 px du suivi
  d'incubation passent à 11–12 px sur mobile.
- **Badges décalés** (`-right-2 -top-2`) des compteurs : ils sortent de leur
  bouton de quelques pixels par conception, identiquement sur desktop.
- Les points « landing » ci-dessus (sections Mission et Journey, ancres
  `#features` depuis `/startups`) sont caducs : la landing a été refaite le
  30/09/2026, voir [`landing-page.md`](landing-page.md).
- Tests sur appareils réels (Safari iOS, Chrome Android) : émulés ici.
