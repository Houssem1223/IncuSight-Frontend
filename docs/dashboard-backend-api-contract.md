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

Aucun helper de query-string n'existe encore côté front (`apiFetch()` prend un chemin
déjà construit). Tu devras écrire un petit `buildDashboardQuery(filters)` (via
`URLSearchParams`, en omettant les clés `undefined`).

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

Tous `GET`, tous sous `/dashboard`. **Seuls les 8 premiers renvoient des données
réelles.** Les 2 derniers existent déjà côté route/guard mais renvoient
systématiquement **501 Not Implemented** — ne les câble pas en Phase 2, c'est prévu en
Phase 4 une fois le backend les implémentés.

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

⚠️ **`actionUrl` ne correspond à AUCUNE route réelle de ce repo aujourd'hui.** Valeurs
possibles actuellement renvoyées par le backend, et ce qu'elles supposeraient côté front :

| `actionUrl` renvoyé | Route réelle la plus proche dans ce repo | Écart |
|---|---|---|
| `/dashboard/admin/incubation?objectiveStatus=BLOCKED` | `/dashboard/admin/incubation-followups` | chemin différent, `objectiveStatus` non lu par la page |
| `/dashboard/admin/incubation?stale=true` | `/dashboard/admin/incubation-followups` | idem |
| `/dashboard/admin/pipeline` | `/dashboard/admin/applications` (le plus proche) | page `/pipeline` inexistante |
| `/dashboard/admin/decisions?programId=...` | pas de page décisions dédiée | page inexistante |
| `/dashboard/admin/overview` | `/dashboard/admin` (page d'accueil du dashboard) | segment `/overview` inexistant |

Aucune page admin existante (`applications`, `incubation-followups`, `program`, …) ne lit
de query params de filtre aujourd'hui (vérifié : zéro `useSearchParams` sur ces pages).
**C'est un vrai gap à traiter en Phase 2, pas un détail** — voir le plan ci-dessous.

### `GET /dashboard/evaluator/overview` — rôle EVALUATOR — **501, ne pas câbler**
### `GET /dashboard/startup/overview` — rôle STARTUP — **501, ne pas câbler**
