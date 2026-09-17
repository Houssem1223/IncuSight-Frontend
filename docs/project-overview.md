# Contexte projet — Vue d'ensemble IncuSight

> Document de contexte **global**, à lire en premier (avant `dashboard-*.md`, qui
> couvrent uniquement le module dashboard admin). Objectif : donner à une nouvelle
> session Claude — ou servir de matière première à un rapport de projet — une vue
> complète du produit, du métier, de l'architecture et de l'état d'avancement, sans
> avoir à ré-explorer les deux dépôts. Rédigé le 2026-09-08.

## 1. Qu'est-ce qu'IncuSight ?

**IncuSight** est une plateforme SaaS de gestion et de suivi de startups pour un
incubateur, développée pour **MEDIANET** (branding constant : titre de page "IncuSight |
MEDIANET Incubateur", mentions "by MEDIANET" dans le footer et les écrans d'auth —
MEDIANET est l'organisation cliente/porteuse du produit, IncuSight en est le nom
produit).

Pitch produit (texte réel de la landing page, `src/components/landing/MissionSection.tsx`) :
> *"L'incubateur, version produit SaaS."* — *"Notre approche combine exigence
> institutionnelle et exécution produit. Chaque programme suit un cadre clair :
> objectifs, jalons, comités d'évaluation, recommandations d'experts et reporting
> continu pour les équipes dirigeantes."*

Trois piliers affichés : **Accompagnement structuré**, **Évaluation transparente**,
**Suivi opérationnel**.

### Cycle de vie métier (déduit du modèle de données, section 4)

```
Startup crée un profil
   → dépose une Candidature (Application) sur un Programme (Program) ouvert
   → l'admin affecte un ou plusieurs Évaluateurs à cette candidature
   → chaque évaluateur soumet une Évaluation (5 critères notés + recommandation)
   → l'admin prend une Décision (acceptée / rejetée) à partir des évaluations
   → si acceptée : création d'un Suivi d'incubation (IncubationFollowUp)
     avec phases (onboarding → diagnostic → build → validation marché →
     préparation pitch → clôture), objectifs et mises à jour d'avancement
   → des Notifications sont émises à chaque étape pour les parties concernées
```

## 2. Deux dépôts, un produit

| Dépôt | Rôle | Stack |
|---|---|---|
| `IncuSight-Frontend` (celui-ci) | Application web (candidat, évaluateur, admin) | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| `IncuSight-Backend` (sibling, `../IncuSight-Backend`) | API REST + logique métier + base de données | NestJS 11, Prisma 7 / PostgreSQL |

Les deux dépôts ont chacun un `CLAUDE.md` + un dossier `docs/` avec la même convention :
lire `docs/` avant d'explorer le code, tenir les documents à jour dans la même tâche
que le changement qui les rend obsolètes.

### Stack technique exacte

**Frontend** (`package.json`) :
- `next@16.2.1`, `react@19.2.4`, `react-dom@19.2.4`
- `@tanstack/react-query@^5.102.3` (data-fetching du module dashboard uniquement,
  voir `docs/dashboard-phase2-plan.md`)
- `recharts@^3.10.1` (un seul graphique aujourd'hui, `TimeseriesCard`, voir
  `docs/dashboard-frontend-context.md` §3)
- `lucide-react@^1.16.0` (icônes), `tw-animate-css@^1.4.0`
- Tooling : TypeScript 5, Tailwind v4 (config 100% CSS, pas de `tailwind.config.*`),
  ESLint 9 + `eslint-config-next`
- Pas de Jest/Vitest : `npm test` lance un runner Node natif maison
  (`--experimental-loader` + `tests/typescript-loader.mjs`)

**Backend** (`IncuSight-Backend/package.json`) :
- `@nestjs/{common,core,config,jwt,mapped-types,passport,platform-express,schedule,swagger,throttler,cache-manager}@11.x`
- `@prisma/client@^7.5.0` + `@prisma/adapter-pg@^7.5.0`, `pg@^8.20.0`
- Auth : `passport@^0.7.0`, `passport-jwt@^4.0.1`, `bcrypt@^6.0.0`
- Validation : `class-validator@^0.14.1`, `class-transformer@^0.5.1`
- Email : `nodemailer@^7.0.10`
- Doc API : `@nestjs/swagger` + `swagger-ui-express` déjà branchés
- Tests : `jest@^30.3.0`, `ts-jest@^29.4.6`, `supertest@^7.2.2`
- Scripts notables : `start:demo` / `db:demo:migrate` / `db:demo:seed` (base et env
  `.env.demo` séparés de la base de dev, utile pour tester sans risquer les données
  réelles)

## 3. Les 3 rôles utilisateurs

`Role` (enum partagé frontend/backend) : **ADMIN**, **STARTUP**, **EVALUATOR**.

- Routing post-login : `src/lib/routeDashboard.ts` → `getDashboardRoute(role)` mène
  vers `/dashboard/admin`, `/dashboard/startup` ou `/dashboard/evaluateur`.
- Protection de page : `src/components/auth/Roleguard.tsx` — redirige vers le
  dashboard du rôle réel si l'utilisateur n'a pas le bon rôle ; affiche un skeleton
  tant que `!isAuthReady`. Posé soit dans le `page.tsx`, soit dans le composant
  délégué (les deux patterns coexistent dans le repo).
- Navigation latérale par rôle : `src/lib/dashboard-nav.ts` (`dashboardNavByRole`) —
  9 items pour ADMIN, 6 pour STARTUP, 4 pour EVALUATOR, consommés par `Sidebar.tsx`.

### Admin (`/dashboard/admin/**`)

Le rôle le plus riche fonctionnellement — vue d'ensemble complète de l'incubateur.

| Route | Composant délégué | Rôle |
|---|---|---|
| `admin` (Overview) | `AdminDashboardOverview` | Dashboard KPI/graphiques — **déjà documenté en détail**, voir `dashboard-frontend-context.md`, `dashboard-backend-api-contract.md`, `dashboard-phase2-plan.md` |
| `applications` | `AdminApplicationsManagement` | Liste/gestion de toutes les candidatures |
| `application-evaluators` | `AdminApplicationEvaluatorsManagement` | Affectation d'évaluateurs à une candidature précise |
| `application-evaluations` | `AdminApplicationEvaluationsManagement` | Consultation des grilles d'évaluation soumises |
| `program` | `AdminProgramsManagement` | CRUD des programmes (création via modal, `CreateProgramModal`) |
| `startups` | `AdminStartupsList` | Liste des profils startup (lecture seule — pas de création admin, voir §7) |
| `users` | `AdminUsersManagement` | Gestion des comptes (activation/désactivation, rôles) |
| `incubation-followups` | `AdminIncubationFollowupsManagement` | Vue admin des suivis d'incubation en cours |
| `notifications` | `NotificationsPanel` (générique, partagé par les 3 rôles) | Notifications de l'admin |

### Évaluateur (`/dashboard/evaluateur/**`)

| Route | Composant délégué | Rôle |
|---|---|---|
| `evaluateur` | — | Dashboard évaluateur (100% dynamique, pas de données factices, voir `dashboard-frontend-context.md` §1) |
| `assignments` | `EvaluatorAssignedApplications` | Candidatures qui lui sont affectées |
| `reviews` | `EvaluatorReviewsManagement` | Saisie et soumission des grilles d'évaluation |
| `notifications` | `NotificationsPanel` | Ses notifications |

### Startup (`/dashboard/startup/**`)

| Route | Composant délégué | Rôle |
|---|---|---|
| `startup` | inline dans `page.tsx` (~600 lignes) | Candidater à un programme ouvert, gérer ses candidatures — **100% dynamique**, pas de données factices |
| `applications` | `StartupManagement` | Gestion des profils startup possédés |
| `candidatures` | `StartupCandidaturesList` | Liste de ses candidatures |
| `incubation-followups` | `StartupIncubationFollowups` / `StartupIncubationFollowupsInteractive` | Suivi de sa propre incubation |
| `profile` | — | Compte + agrégat de ses startups |
| `notifications` | `NotificationsPanel` | Ses notifications |

### Routes publiques

- `src/app/page.tsx` — landing page complète (`LandingHeader`, `HeroSection`,
  `MissionSection`, `FeaturesSection`, `IncubationJourneySection`,
  `WhyChooseSection`, `FinalCTASection`, `FooterSection`).
- **Pas de route `/login` ou `/signup` dédiée** — choix produit assumé : le
  formulaire vit dans une modale sur la landing (`LandingLoginCard`, `SignupForm`),
  ouverte via `?auth=login` / `?auth=signup`. `src/app/login/page.tsx` ne fait
  qu'une redirection vers cette modale (`LANDING_LOGIN_ROUTE`).
- `forgot-password`, `reset-password` (lit `?token=`), `verify-email` (lit
  `?token=`) — pages dédiées via `AuthPageShell`.

## 4. Modèle de domaine (`IncuSight-Backend/prisma/schema.prisma`, 373 lignes)

**Enums** :

| Enum | Valeurs |
|---|---|
| `Role` | ADMIN, STARTUP, EVALUATOR |
| `ApplicationStatus` | PENDING, ACCEPTED, REJECTED |
| `EvaluationStatus` | PENDING, IN_PROGRESS, SUBMITTED |
| `EvaluationRecommendation` | FAVORABLE, RESERVED, UNFAVORABLE |
| `NotificationType` | APPLICATION_SUBMITTED, APPLICATION_UNDER_REVIEW, PROGRAM_ASSIGNED, APPLICATION_ASSIGNED, EVALUATION_SUBMITTED, ALL_EVALUATIONS_COMPLETED, DEADLINE_APPROACHING, DECISION_PUBLISHED, FEEDBACK_PUBLISHED |
| `IncubationStatus` | ACTIVE, COMPLETED, SUSPENDED, DROPPED |
| `IncubationPhase` | ONBOARDING, DIAGNOSTIC, BUILD, MARKET_VALIDATION, PITCH_PREPARATION, CLOSING |
| `FollowUpObjectiveStatus` | TODO, IN_PROGRESS, DONE, BLOCKED |
| `FollowUpObjectivePriority` | LOW, MEDIUM, HIGH |
| `EmailTokenType` | EMAIL_VERIFICATION, PASSWORD_RESET |

**Entités principales** :

- **User** — email (unique), password (hashé), role, isActive, isEmailVerified,
  `authVersion` (compteur permettant de révoquer toutes les sessions d'un coup).
- **Program** — title, description, openDate/closeDate, isOpen.
- **ProgramEvaluator** — table de jointure Program↔User, un évaluateur peut être
  affecté à un programme entier (en plus de l'affectation par candidature).
- **StartupProfile** — startupName, description, sector, stage, website,
  ownerId → User.
- **Application** (candidature) — motivationLetter, status, unique par
  (startupId, programId).
- **ApplicationEvaluatorAssignment** — Application↔User(evaluator), avec
  deadlineAt + deadlineReminderSentAt (base des rappels automatiques).
- **Evaluation** — 5 scores (innovation, market, team, feasibility, fit) +
  overallScore calculé, strengths/weaknesses/comment, recommendation, status ;
  unique par (applicationId, evaluatorId) — un évaluateur = une évaluation par
  candidature.
- **Decision** — status (accepté/rejeté), comment, decidedById, decidedAt ; 1-1
  avec Application.
- **IncubationFollowUp** — status, phase, progress (%), notes, startDate/endDate ;
  1-1 avec Application, contient des **FollowUpObjective** (avec priorité et
  deadline) et des **FollowUpUpdate** (rapports d'avancement : done, blockers,
  needs, nextSteps).
- **Notification** — title, message, type, isRead/readAt, liens optionnels vers
  application/program/evaluation/decision, champ `data` JSON libre.
- **BlacklistedToken**, **EmailToken** — support technique de l'auth (révocation
  JWT, tokens de vérification/reset à usage unique avec expiration).

⚠️ **`StartupProfile` a beaucoup grossi** depuis la première rédaction de ce
document. Champs à connaître, en plus de ceux listés ci-dessus :

- `status` (`StartupProfileStatus` : `DRAFT | PUBLISHED`) — un profil naît en
  brouillon et ne peut candidater qu'une fois publié. Le type frontend `Startup`
  correspond exactement ; l'ancien « écart `status` » de ce document n'existe plus.
- Pitch deck : `pitchDeckPath`, `pitchDeckOriginalName`, `pitchDeckMimeType`,
  `pitchDeckSize`, `pitchDeckUploadedAt`.
- Logo : `logoPath`, `logoOriginalName`, `logoMimeType`, `logoSize`,
  `logoUploadedAt`.
- Liens publics : `linkedinUrl`, `deckUrl`.
- `isPublicShowcase` — opt-in explicite à la vitrine publique (`/startups`).

⚠️ `pitchDeckPath` et `logoPath` sont sous **omit global Prisma**
(`PrismaService`) : ils ne sortent jamais de l'API, y compris dans les relations
imbriquées. Les méthodes qui ont réellement besoin du chemin le redemandent par un
`select` explicite — c'est un piège à connaître avant d'écrire une suppression de
fichier (cf. `startup.service.ts#removeMine`).

⚠️ `StartupProfile` n'a **ni `createdAt` ni `updatedAt`**, contrairement aux autres
modèles.

## 5. Modules backend (`IncuSight-Backend/src/modules/`)

| Module | Responsabilité |
|---|---|
| `auth` | Login JWT (access + refresh), vérification email, reset password, logout, blacklist de tokens, rate limiting |
| `application` | CRUD candidatures, changement de statut, décision admin |
| `application_evaluator` | Affectation/retrait d'évaluateurs sur une candidature précise |
| `evaluation` | Saisie/soumission des grilles d'évaluation, synthèses |
| `program` | CRUD programmes, liste publique (`program/public`) |
| `programevaluator` | Affectation d'évaluateurs à un programme entier |
| `startup` | CRUD des profils startup |
| `users` | Gestion des comptes (admin) + self-service profil |
| `incubation-followups` | Suivi post-acceptation : phases, objectifs, updates |
| `notifications` | Liste, compteur non-lus, marquage lu, suppression ; scheduler pour les rappels de deadline |
| `mail` | Envoi d'emails (nodemailer), utilisé par `auth` et `notifications` |
| `dashboard` | Agrégations KPI/reporting admin — **déjà documenté**, voir `dashboard-backend-api-contract.md` |
| `Prisma` | Service Prisma partagé, injecté partout |

Briques transverses (`src/core/common/`) : `guards/auth.guard.ts` (JWT),
`guards/role.guard.ts` (RBAC), `decorators/roles.decorator.ts`,
`security/password-policy.constants.ts`.

## 6. Authentification — comment ça marche

**Backend** : JWT signé (`JWT_SECRET`), payload `{ sub, type: "access", authVersion }`.
`AuthGuard` vérifie signature + type de token + `authVersion` (permet de révoquer
toutes les sessions d'un user en l'incrémentant) + blacklist + compte actif/vérifié.
`RolesGuard` lit `@Roles(...)` et compare au rôle du token. **Pas de garde global** :
chaque contrôleur applique `@UseGuards(AuthGuard, RolesGuard)` route par route
(`notifications` n'utilise que `AuthGuard`, accessible à tout rôle authentifié).
Refresh via `auth/refresh-token` (endpoint séparé, throttlé).

**Frontend** : tokens en **`localStorage`** (`token`, `refreshToken`).
`src/lib/api.ts` (`apiFetch`, 470 lignes) centralise tout : header `Authorization`,
refresh automatique sur 401 avec verrou anti-concurrence (évite les races si
plusieurs requêtes 401 arrivent en même temps), synchronisation multi-onglets via
des `CustomEvent` (`incusight:auth-token-updated`, `incusight:auth-session-expired`)
écoutés par `AuthContext`. Une liste explicite d'endpoints exemptés de bearer/refresh
existe (`ENDPOINTS_WITHOUT_BEARER`, `ENDPOINTS_WITHOUT_REFRESH`) pour les routes
publiques (ex. `program/public`).

## 7. Frontend — contexts et types

### Contexts React (`src/contexts/`)

Pattern uniforme sur tous les contexts métier : `useState` + `fetchX()` manuel
(pas de cache/staleTime — sauf le module dashboard qui utilise TanStack Query en
plus, voir `dashboard-phase2-plan.md`).

| Context | State exposé |
|---|---|
| `AuthContext` | `user`, `token`, `refreshToken`, `isAuthenticated`, `isAuthReady`, `sessionExpired` |
| `UserContext` | `users[]` — CRUD admin complet + self-service (signup, updateMyProfile, changeMyPassword) |
| `ProgramContext` | `programs[]`, `publicPrograms[]` (landing, sans token) |
| `ProgramEvaluatorContext` | `evaluatorsByProgramId`, `myPrograms[]` |
| `StartupContext` | `startups[]` (admin), `myStartups[]`, `myStartup` |
| `ApplicationContext` | `applications[]` (admin), `myApplications[]`, `makeDecision(...)` |
| `ApplicationEvaluatorContext` | `evaluatorsByApplicationId`, `myAssignedApplications[]` |
| `EvaluationContext` | `myEvaluations[]`, `evaluationsByApplicationId`, `summariesByApplicationId` |
| `IncubationFollowupsContext` | `followUps[]`, `myFollowUps[]`, CRUD objectifs/updates |
| `NotificationContext` | `notifications[]`, `unreadCount` (auto-refresh 30s, voir usage dans `Header.tsx` et `Sidebar.tsx`) |
| `DashboardThemeContext` | dark mode local au dashboard, aucun appel API |

Tous montés dans `src/app/dashboard/(protected)/layout.tsx` (`DashboardProviders`),
imbriqués et disponibles pour les 3 rôles.

### Types métier (`src/types/`)

`auth.ts`, `user.ts`, `application.ts`, `program.ts`, `startup.ts`, `evaluation.ts`,
`incubation-followups.ts`, `notification.ts` — un fichier par domaine, reflètent les
entités Prisma côté frontend (avec le typage défensif `[key: string]: unknown`
mentionné en §4).

## 8. Tests

- **Frontend** (`tests/`, 7 fichiers `.mjs` + 1 loader utilitaire) — tests unitaires
  légers via un runner Node natif custom (`npm test`), 8 fichiers, 68 tests.
  Auth/session : `api-refresh`, `auth-routing`, `auth-validation`,
  `email-verification`, `password-recovery`, `resend-verification`, `signup`.
  Règles métier : `business-rules` (bornes de notation, politique de mot de passe,
  construction des query strings paginées, routage des notifications par rôle).
  ⚠️ Le loader ne transpile que les fichiers `.ts` — un test ne peut donc pas
  importer un `.tsx`. C'est pourquoi les règles pures des écrans vivent dans
  `src/lib/*.ts` (`evaluation-scores`, `password-policy`, `application-query`,
  `pagination`) : les y laisser inline les rendrait intestables.
  Toujours rien sur les contexts React eux-mêmes ni sur les composants UI.
- **Backend** — 39 fichiers `*.spec.ts`, 203 tests (Jest, un `.controller.spec.ts`
  + `.service.spec.ts` par module) + `test/app.e2e-spec.ts` et
  `test/dashboard.e2e-spec.ts` (e2e). Le module `dashboard` est le plus testé
  (scoring, séries temporelles, périodes, insights, cache).
  ⚠️ `npm run lint` du backend **ne fonctionne pas** : la configuration est au
  format `.eslintrc.js` alors qu'ESLint 10 exige `eslint.config.js`. À migrer.

## 9. État d'avancement

- Aucun `TODO`/`FIXME` de développeur significatif dans le code métier des deux
  dépôts (seules occurrences : la valeur d'enum légitime `FollowUpObjectiveStatus.TODO`).
- **Plus aucun endpoint ne renvoie 501.** `dashboard/evaluator/overview` et
  `dashboard/startup/overview` sont implémentés et câblés.
- Le module **dashboard admin** est entièrement branché sur des données réelles
  (8 endpoints, TanStack Query, filtres pilotés par l'URL, série temporelle
  Recharts, insights avec drill-down). Aucune donnée factice ne subsiste.
- Les dashboards **évaluateur** et **startup** ont chacun leur propre vue agrégée
  (`EvaluatorDashboardOverview`, `StartupDashboardOverview`). `/dashboard/evaluateur`
  n'est plus un doublon de `/dashboard/evaluateur/assignments`.
- Le backlog issu de l'audit du 15/09/2026 (document de travail supprimé depuis)
  a été exécuté : **vagues 1 et 2 complètes** sauf V2-09 (stockage S3,
  bloqué faute de fournisseur), **vague 3 complète**. Détail de ce qui a changé et
  des pièges rencontrés : [`backlog-execution-2026-09.md`](backlog-execution-2026-09.md).

## 10. Pour aller plus loin

- Contrat API et modèle de données détaillés du module dashboard :
  [`dashboard-backend-api-contract.md`](dashboard-backend-api-contract.md)
- État des lieux frontend du module dashboard (pages, valeurs codées en dur
  restantes, tokens de thème) : [`dashboard-frontend-context.md`](dashboard-frontend-context.md)
- Plan de la Phase 2 (câblage, filtres, TanStack Query) :
  [`dashboard-phase2-plan.md`](dashboard-phase2-plan.md)
- Contexte backend équivalent : `IncuSight-Backend/docs/dashboard-backend-context.md`

---

*Document à tenir à jour si l'architecture, le modèle de domaine ou l'état
d'avancement changent significativement — sinon il devient trompeur, ce qui est pire
que l'absence de document.*
