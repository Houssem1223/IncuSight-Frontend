# Contrat API — Module Dashboard (backend)

> Ce que le backend expose réellement aujourd'hui, extrait du code (controller + DTOs
> Swagger), pas de la spec de mission. Si un champ te semble manquant ou différent de ce
> document, le code du backend fait foi — préviens plutôt que de deviner. Backend :
> repo `IncuSight-Backend`, module `src/modules/dashboard/`.

## 1. Base et auth

- URL de base : `process.env.NEXT_PUBLIC_API_URL` (déjà utilisé partout dans ce repo via
  `apiFetch()`, `src/lib/api.ts`). En local, le backend tourne sur le port `8050`.
- Auth : Bearer JWT dans `Authorization`, déjà géré automatiquement par `apiFetch()`
  (injection du token, refresh silencieux sur 401, voir `src/lib/api.ts` ligne ~402).
  **N'utilise pas `fetch()` brut pour ces endpoints, passe par `apiFetch()`** comme le
  reste du repo.
- 401 = pas de token / token invalide. 403 = rôle authentifié mais non autorisé sur la
  route (ex. un EVALUATOR qui appelle `admin/overview`). Les deux sont déjà couverts par
  une suite e2e côté backend (`test/dashboard.e2e-spec.ts`, 41 tests) — tu n'as rien à
  reprouver, juste à afficher ces erreurs proprement côté UI (redirection / message).
- Réponses d'erreur : format Nest par défaut, `{ statusCode, message, error }` — déjà
  compatible avec `extractErrorMessage()`/`ApiError` existants dans `src/lib/api.ts`.
- CORS backend verrouillé sur `http://localhost:3000` (le port par défaut de `next dev`).

## 2. Filtres communs (query params)

Partagés par les 8 endpoints admin, validés côté backend par `class-validator` — un
param en dehors de ces valeurs renvoie 400.

| Param | Type | Détail |
|---|---|---|
| `programId` | `string?` | id d'un `Program` |
| `period` | `'7d' \| '30d' \| '3m' \| '1y' \| 'custom'` | défaut si absent : `30d` |
| `from` | `string?` (ISO 8601, ex. `2026-07-01`) | **obligatoire si `period=custom`** |
| `to` | `string?` (ISO 8601) | **obligatoire si `period=custom`** |
| `status` | `'PENDING' \| 'ACCEPTED' \| 'REJECTED'` | **valeurs réelles de `ApplicationStatus` — pas de `WAITLISTED`/liste d'attente, ça n'existe pas dans le schéma, décision déjà validée côté backend** |

Le helper existe désormais côté front : `buildDashboardQuery(filters)` dans
[`src/lib/dashboard-api.ts`](../src/lib/dashboard-api.ts) (via `URLSearchParams`, les
clés `undefined` sont omises). C'est lui qui construit le chemin passé à `apiFetch()`,
et les `queryKey` TanStack Query sont bâties sur le même objet de filtres.

Le backend calcule systématiquement une période courante ET une période précédente de
même durée en retour (voir `ResolvedPeriodDto` ci-dessous) — c'est lui qui fait ce calcul,
pas le front.

## 3. Cache — transparent, rien à faire côté front

Les 8 endpoints `admin/*` sont cachés côté serveur (TTL 45s, clé = URL+filtres+rôle, ou
+userId pour `admin/activity` qui est scopé par admin appelant). Un header `X-Cache:
HIT|MISS` est présent en debug uniquement — **ne construis aucune logique dessus**, c'est
un détail d'implémentation serveur. Une requête identique dans les 45s peut renvoyer des
données légèrement périmées, c'est voulu.

## 4. Types partagés

```ts
interface PeriodComparison {
  current: number;
  previous: number;
  /** Toujours 0 si deltaComparable=false, jamais NaN/Infinity */
  deltaPercent: number;
  /** false si previous=0 : afficher "non comparable", jamais "+100%" */
  deltaComparable: boolean;
}

interface ResolvedPeriod {
  currentFrom: string; // ISO 8601 — c'est du JSON, pas un objet Date
  currentTo: string;
  previousFrom: string;
  previousTo: string;
}
```

Distinction importante reprise systématiquement plus bas : un champ **stock** (état
courant, ex. `enAttente`) est un simple `number` — pas de comparaison vs période
précédente possible côté API, ne l'affiche pas comme un delta. Un champ **flux**
(borné par la période, ex. `total`, `acceptees`) est un `PeriodComparison`.

## 5. Les 10 endpoints

Tous `GET`, tous sous `/dashboard`. **Les 10 renvoient des données réelles** — les
deux vues personnelles (`evaluator/overview`, `startup/overview`) ne répondent plus
501 et sont câblées côté frontend.

Les 8 endpoints `admin/*` sont réservés au rôle ADMIN ; les 2 vues personnelles
sont scopées à l'utilisateur connecté, jamais à un identifiant fourni par le client.

### `GET /dashboard/admin/overview` — rôle ADMIN
```ts
interface AdminOverviewResponse {
  period: ResolvedPeriod;
  candidatures: {
    total: PeriodComparison;        // Application.createdAt dans la période
    enAttente: number;              // stock — PENDING sans évaluateur assigné
    enEvaluation: number;           // stock — PENDING avec ≥1 évaluateur assigné
    acceptees: PeriodComparison;    // Decision ACCEPTED décidées dans la période
    rejetees: PeriodComparison;
    tauxAcceptation: PeriodComparison; // % = acceptées/(acceptées+rejetées), 0 si aucune décision
  };
  evaluations: {
    total: PeriodComparison;
    enAttente: number;              // stock
    terminees: PeriodComparison;    // soumises dans la période
    delaiMoyenJours: PeriodComparison;
    scoreMoyen: PeriodComparison;   // échelle 1-5, PAS 0-100
    candidaturesEvaluationsCompletes: number; // stock
    enRetard: number;               // stock — deadline dépassée, pas encore soumise
  };
}
```

### `GET /dashboard/admin/pipeline` — rôle ADMIN
```ts
interface AdminPipelineResponse {
  period: ResolvedPeriod;
  stages: { stage: string; count: number }[];
  // stage ∈ 'Candidatures' | 'Évaluation' | 'Sélection' | 'Incubation' — labels FR,
  // PAS des valeurs d'enum. Si tu veux router un clic vers une liste filtrée, il te
  // faudra une table de correspondance locale {label → filtre réel}, l'API n'en fournit
  // pas. Attention : 'Évaluation' ne correspond à AUCUNE valeur de `ApplicationStatus`
  // (pas de UNDER_REVIEW dans le schéma) — c'est `candidatures.enEvaluation` calculé
  // côté back (PENDING + assignation), tu ne peux pas filtrer /applications dessus tel
  // quel sans que cette page sache lire ce filtre dérivé.
}
```

### `GET /dashboard/admin/timeseries` — rôle ADMIN
```ts
interface TimeseriesPoint {
  bucket: string; // ISO 8601, début du bucket
  candidatures: number;
  acceptations: number;
  delaiMoyenJours: number | null; // null = aucune évaluation soumise dans ce bucket
}
interface AdminTimeseriesResponse {
  period: ResolvedPeriod;
  granularity: 'day' | 'week' | 'month'; // auto : ≤30j jour, ≤90j semaine, au-delà mois
  current: TimeseriesPoint[];
  previous: TimeseriesPoint[]; // même granularité, même nombre de points, pour superposition
}
```

### `GET /dashboard/admin/decisions` — rôle ADMIN
```ts
interface AdminDecisionsResponse {
  period: ResolvedPeriod;
  decisions: {
    enAttente: number;
    acceptees: number;
    rejetees: number;
    total: number; // = somme des 3
  };
}
// Donut à 3 parts seulement. Pas de "liste d'attente" (n'existe pas dans le schéma).
```

### `GET /dashboard/admin/incubation` — rôle ADMIN
```ts
interface AdminIncubationResponse {
  // period définit ici une COHORTE (startDate dans la fenêtre), pas une comparaison —
  // n'affiche pas de delta % dessus, l'API n'en fournit pas pour ce endpoint.
  period: ResolvedPeriod;
  incubation: {
    startupsActuellementIncubees: number;
    progressionMoyenne: number; // 0-100
    objectifs: { todo: number; inProgress: number; done: number; blocked: number };
    startupsSansUpdateRecent: number; // >14j sans FollowUpUpdate
    startupsEnRetard: number;
    repartitionParPhase: { phase: string; count: number }[];
    // phase ∈ ONBOARDING | DIAGNOSTIC | BUILD | MARKET_VALIDATION | PITCH_PREPARATION | CLOSING
  };
}
```

### `GET /dashboard/admin/top-startups` — rôle ADMIN
```ts
interface TopStartup {
  startupId: string;
  startupName: string;
  sector: string | null;
  score: number; // 0-100 = 0.40×évaluation + 0.30×progression + 0.20×objectifs + 0.10×régularité
  breakdown: {
    evaluationScoreNormalized: number;
    incubationProgress: number;
    objectivesCompletionRate: number;
    updateRegularityRate: number;
  };
}
interface AdminTopStartupsResponse {
  totalStartupsActives: number;
  classement: TopStartup[]; // limité à 10, trié par score décroissant
}
// `period` accepté par la validation mais IGNORÉ ici (un classement reflète l'état
// actuel, pas une fenêtre) — envoie-le si tu veux par cohérence de query key, ça ne
// changera pas le résultat au-delà de `programId`.
```

### `GET /dashboard/admin/activity` — rôle ADMIN
```ts
interface ActivityItem {
  id: string;
  type: string; // un NotificationType Prisma, ex. 'APPLICATION_SUBMITTED'
  title: string;
  message: string;
  createdAt: string; // ISO 8601
  applicationId: string | null;
  programId: string | null;
  evaluationId: string | null;
  decisionId: string | null;
}
interface AdminActivityResponse { activites: ActivityItem[]; } // limité à 15
// Scopé à l'admin appelant (ses propres notifications), pas un flux global. `period`
// ignoré comme top-startups.
```

### `GET /dashboard/admin/insights` — rôle ADMIN
```ts
interface Insight {
  id: string; // stable, ex. 'blocked-objectives', ou 'low-acceptance-rate:<programId>'
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric: number | null;
  delta: number | null;
  actionLabel: string | null;
  actionUrl: string | null;
  entityIds: string[];
}
interface AdminInsightsResponse { insights: Insight[]; }
```


✅ **Les `actionUrl` pointent désormais vers de vraies routes**, des deux côtés : le
backend les a alignées sur les chemins réels (`insights.rules.ts`, avec une liste
`FRONTEND_ROUTES` assertée en test), et le frontend les résout via
`resolveInsightHref` (`admin/dashboard/insightActionLinks.ts`) plutôt que de suivre
l'URL brute. `/dashboard/admin/applications` lit bien `?status=` et `?search=`.

### `GET /dashboard/evaluator/overview` — rôle EVALUATOR

Vue personnelle de l'évaluateur connecté, scopée à `req.user.sub`. Cachée avec une
clé incluant l'id de l'appelant (routes « user-scoped » de l'intercepteur).

```ts
interface EvaluatorOverviewResponse {
  period: ResolvedPeriod;
  // Stocks : état courant, non comparés à la période précédente.
  charge: { assignees: number; aDemarrer: number; enCours: number; enRetard: number };
  production: {
    soumises: PeriodComparison; // flux, borné par la période
    scoreMoyenDonne: number;    // échelle 1-5
    recommandations: { FAVORABLE: number; RESERVED: number; UNFAVORABLE: number };
  };
  prochainesEcheances: {
    applicationId: string;
    startupName: string;
    programTitle: string;
    deadlineAt: string | null;
    enRetard: boolean;
  }[];
}
```

### `GET /dashboard/startup/overview` — rôle STARTUP

Vue personnelle de la startup connectée, scopée au propriétaire.

```ts
interface StartupOverviewResponse {
  period: ResolvedPeriod;
  profils: { total: number; publies: number; brouillons: number };
  candidatures: {
    total: number;
    enAttente: number;
    acceptees: number;
    rejetees: number;
    deposeesSurLaPeriode: PeriodComparison;
  };
  incubation: {
    followUpId: string;
    startupName: string;
    programTitle: string;
    status: string;
    phase: string;
    progress: number;
    startDate: string;
    objectifs: { total: number; termines: number; enRetard: number };
    dernierPointAt: string | null;
    // Même seuil de 14 jours que le KPI admin « startups sans update récent ».
    pointEnRetard: boolean;
  }[];
}
```

## 6. Hors module dashboard : les exports

Le module `reports` sert les documents (ADMIN uniquement) :
`GET /reports/applications/:id/evaluations.pdf`,
`GET /reports/applications/:id/decision.pdf`,
`GET /reports/applications.csv` (accepte `status`, `programId`),
`GET /reports/startups.csv`, `GET /reports/incubation.csv`.
