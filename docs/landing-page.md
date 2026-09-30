# Landing page publique

Refonte du 30 septembre 2026. Landing premium d'une plateforme d'incubation
technologique développée pour MEDIANET, avec l'identité IncuSight conservée
(marque orange, fusée, Geist). Frontend uniquement ; routes d'authentification,
dashboards et PWA inchangés.

## 1. Règle sur les données

**Aucune donnée inventée.** Les anciens chiffres du hero (« 40+ programmes »,
« 120 experts », « 1.8k dossiers ») et le composant `ProgramsPreviewSection`
(trois programmes fictifs, jamais affiché) ont été supprimés.

Toutes les données institutionnelles vivent dans
[`src/components/landing/landing-content.ts`](../src/components/landing/landing-content.ts),
avec leur source :

| Donnée | Source officielle (vérifiée le 30/09/2026) |
|---|---|
| « plus de 25 ans d'expertise digitale et sectorielle », expertise technique et métier, partenaires, intrapreneuriat (Medianautes), MEDIANET Incubateur Space | https://www.medianet-group.com/fr/medianet-incubateur |
| FoodStart : 8 startups (1re cohorte), 2 Label Startup, 7 commercialisent leurs produits, 2 levées de fonds finalisées, 22 sessions, 6 mois, prototypage, accès au marché et plateformes de test, expertise, mentoring 10 h/mois, réseau de partenaires, Startup Village | https://www.medianet-group.com/fr/foodstart- |

- Chaque chiffre porte son périmètre (« MEDIANET » ou « FoodStart ») et la section
  cite ses sources : jamais présenté comme une statistique d'IncuSight.
- La page MEDIANET mentionne aussi « 20 ans d'expérience » ; la formulation
  « plus de 25 ans » est celle retenue, citée telle quelle.
- La presse (managers.tn) donnait 2 startups en commercialisation à un stade
  antérieur ; la page officielle FoodStart, plus récente, indique 7.
- Aucune adresse ni coordonnée : le contact renvoie au site officiel.
- Les maquettes (hero, suivi d'incubation) utilisent « Projet Alpha/Beta/Gamma »
  et portent la légende « données fictives » / « exemple illustratif ».
- Section IA : uniquement ce qui est implémenté — synthèse des évaluations,
  divergences entre évaluateurs, analyse d'accompagnement du suivi — présenté
  comme une aide consultative réservée à l'administration. Pas d'analyse de
  pitch deck, pas de prédiction de réussite.
- Gouvernance : rôles vérifiés côté serveur, vérification d'email,
  réinitialisation, révocation des sessions, historique des révisions de
  décision, notifications — tous présents dans les deux dépôts.
- Programmes : FoodStart (page officielle) + programmes **réellement ouverts**
  lus sur `GET program/public` (`isProgramOpen`), trois au plus. En cas d'erreur
  ou d'absence, rien n'est affiché.

## 2. Structure

`src/app/page.tsx` — header, `main` avec 11 sections, footer.

| Section (ancre) | Composant |
|---|---|
| Hero | `HeroSection`, `HeroProductPreview` (vrais `.semantic-badge` et `Progress`) |
| L'incubation en un seul espace (`#fonctionnalites`) | `PlatformSection` |
| MEDIANET Incubator (`#a-propos`) | `MedianetSection` |
| Chiffres clés | `KeyFiguresSection` |
| Programmes (`#programmes`) | `ProgramsSection`, `OpenPrograms` |
| Comment ça fonctionne (`#parcours`) | `JourneySection` |
| Rôles (`#modules`) | `RolesSection` |
| Suivi d'incubation (`#suivi`) | `FollowUpSection` |
| Intelligence (`#intelligence`) | `AiSection` |
| Gouvernance | `GovernanceSection` |
| CTA final | `FinalCtaSection` |
| Footer (`#contact`) | `FooterSection` |

Navigation : `landingNavItems` (ancres absolues `/#…`, valables aussi depuis
`/startups`). Le header, partagé avec `/startups`, devient opaque avec une ombre
au défilement ; menu mobile `LandingMobileMenu` ; CTA « Se connecter » visible
dès 360 px.

Styles : [`src/app/landing.css`](../src/app/landing.css) (classes `.lp-*`, sans
effet ailleurs) et tokens `ink`, `ocean`, `ocean-soft`, `leaf`, `canvas` dans
`globals.css`.

## 3. Authentification

Le formulaire a quitté le hero. `LandingAuthDialog` l'affiche en dialogue quand
`?auth=` ou `sessionExpired=1` est présent : `/login`, `LANDING_LOGIN_ROUTE`,
`LANDING_SIGNUP_ROUTE`, la session expirée et le lien de vérification d'email
fonctionnent sans changement. Focus sur l'email, Tab bouclé, Échap et fond
cliquable ferment (retour à `/`), défilement de la page bloqué. Rendu sans
portail, donc présent dès le HTML serveur. `LandingLoginCard` et `SignupForm`
sont réutilisés tels quels.

`LandingSessionRedirect` conserve un comportement de l'ancienne page : un
utilisateur connecté qui ouvre `/` part vers son dashboard (auparavant assuré par
la carte de connexion, montée en permanence).

## 4. Correctif global : couleur des liens

`globals.css` contenait `a { color: inherit }` **hors couche**. Une règle hors
couche bat les utilitaires Tailwind : tout `text-*` posé sur un lien était
ignoré (bouton « Se connecter » navy sur navy, CTA orange à texte navy). La
règle est retirée ; le preflight de Tailwind la déclare déjà en `@layer base`.
Effet : les couleurs prévues sur les liens s'appliquent partout, dashboards
compris (voir §6).

## 5. SEO, métadonnées, animations

- Title « IncuSight | Plateforme digitale d'incubation », meta description,
  Open Graph, Twitter, `canonical`. `metadataBase` lit `NEXT_PUBLIC_SITE_URL`
  (à renseigner en production, sinon Next utilise localhost).
- `src/app/opengraph-image.tsx` : image de partage 1200×630 générée au build.
- `generator: "v0.app"` (reste du gabarit) retiré du layout.
- HTML sémantique : un seul `h1`, sections `aria-labelledby`, `nav` étiquetées,
  listes pour les cartes, `dl` pour les chiffres, liens externes annoncés.
- Animations : entrée du hero, apparition au défilement (`LandingReveal`,
  IntersectionObserver), survol des cartes, flèche des CTA. Rien n'est masqué
  sans JavaScript ; tout est désactivé avec `prefers-reduced-motion`.

## 6. Validation

- `npm run lint`, TypeScript, `npm run build` : sans erreur. `npm test` : 325/325.
- `node tests/visual/responsive/landing.mjs` (build de production, API factice) :
  13/13 — aucune scrollbar horizontale à 1440, 1280, 1024, 768, 430 et 390 px,
  toutes les sections apparues, un seul `h1`, aucun message console (hydratation
  comprise), ancres et liens internes valides, CTA → dialogue (focus, Échap),
  routes `/login`, `?auth=signup`, session expirée, menu mobile, mouvement
  réduit, PWA (SW actif, manifest, `/offline`, `/opengraph-image`), aucune
  exception. Liens externes MEDIANET : HTTP 200.
- `tests/visual/responsive/audit.mjs` : 1024 px ajouté aux largeurs mesurées.
- Effet du correctif §4 sur les dashboards : voir le rapport de la tâche.
