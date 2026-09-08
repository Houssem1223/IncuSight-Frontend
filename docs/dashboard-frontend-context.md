# Contexte projet — Dashboard (frontend)

> Complète [`IncuSight-Backend/docs/dashboard-backend-context.md`](../../IncuSight-Backend/docs/dashboard-backend-context.md)
> pour la mission de transformation des dashboards (prompt `prompt-claude-code-incusight-dashboard.md`).
> Objectif : donner l'état des lieux frontend nécessaire à la Phase 0/2/3 sans avoir à
> ré-explorer le dépôt. Portée actuelle : dashboard admin en priorité (le plus riche en
> données factices), evaluator/startup couverts en section 2.C.

## 1. Pages dashboard par rôle

- **Admin** — [`src/app/dashboard/(protected)/admin/page.tsx`](../src/app/dashboard/(protected)/admin/page.tsx) :
  page monolithique, quasiment tout le contenu (KPIs, pipeline, top startups, activité,
  répartition des rôles, performance) est codé en dur directement dans ce fichier (~530
  lignes). Utilise `RoleGuard`, `Badge`/`Card*` (`src/components/ui/`), et
  `useDashboardTheme` (`src/contexts/DashboardThemeContext.tsx`).
- **Évaluateur** — [`src/app/dashboard/(protected)/evaluateur/page.tsx`](<../src/app/dashboard/(protected)/evaluateur/page.tsx>)
  délègue à [`EvaluatorAssignedApplications.tsx`](../src/components/dashboard/evaluateur/EvaluatorAssignedApplications.tsx),
  qui calcule ses KPI par `useMemo` à partir de `useApplicationEvaluators` /
  `useProgramEvaluators` — **100% dynamique, aucune valeur factice**.
- **Startup** — [`src/app/dashboard/(protected)/startup/page.tsx`](<../src/app/dashboard/(protected)/startup/page.tsx>) :
  page inline pilotée par `ApplicationContext`/`ProgramContext`/`StartupContext` —
  **100% dynamique, aucune valeur factice**.
- Routeur commun : `src/app/dashboard/page.tsx` → `getDashboardRoute(role)`
  (`src/lib/routeDashboard.ts`). Tous les providers sont montés dans
  `src/app/dashboard/(protected)/layout.tsx` (`DashboardProviders`).

**Conclusion : le seul foyer de données factices est `admin/page.tsx`.** Confirmé par
grep (`mock|dummy|faker|Math.random|TechVision|GreenEnergy|FinFlow|HealthTech`) sur tout
`src/` — aucune occurrence hors de ce fichier.

## 2. Valeurs codées en dur — `admin/page.tsx`

| Bloc | Lignes | Contenu |
|---|---|---|
| Actions rapides | 25-30 | 4 boutons sans `onClick`/`href`, purement décoratifs |
| Activité récente | 32-38 | 5 événements fake (`TechVision AI`, `GreenEnergy Plus`, …) |
| Top startups | 40-45 | 4 startups fake avec `score` (94/91/88/85), `trend` |
| Pipeline (barres) | 47-52 | 4 étapes fake ; largeur calculée avec dénominateur en dur `/127` (ligne 313) |
| Répartition des rôles (donut) | 54-58 | 3 rôles fake ; total `243` en dur au centre (lignes 451-453) |
| Cibles KPI animées | 60-65 | `{ applications: 127, startups: 34, conversion: 26.7, active: 91 }`, animées via `setInterval` (84-108) — simulation, pas un calcul |
| `statusColors` | 67-73 | Clés `pending/completed/success/warning/info` — **ne correspondent à aucun statut réel** (`Application.status` = `PENDING/ACCEPTED/REJECTED`) |
| Carte Applications | ~193, 202 | `+12%` en dur, barre figée `w-3/4` |
| Carte Startups acceptées | 228 | Barre figée `w-1/4` |
| Carte Délai moyen review | 238-254 | `2.8j` / `Objectif: 3j` en dur, barre figée `w-[93%]` |
| Carte Comptes actifs | 279 | Barre figée `w-[91%]` |
| Taux de conversion global | 323 | `26.7%` en dur |
| Performance ce mois (4 cartes) | 489-525 | `89%`, `76%`, `4.2h`, `4.8/5` entièrement statiques |
| Badge "Live" | 293-295 | Affiché en dur, aucun lien avec un flux temps réel |

**Sidebar nav** — [`src/lib/dashboard-nav.ts`](../src/lib/dashboard-nav.ts) lignes 29-47 :
badges statiques `Notifications: "3"`, `Startups: "24"`, `Programs: "5"`,
`Applications: "12"` — à comparer avec `Header.tsx` (295-315) qui, lui, utilise déjà un
vrai `unreadCount` dynamique via `useNotifications()`. Incohérence à trancher : rendre
ces badges dynamiques ou les assumer hors périmètre.

## 3. Librairie de graphiques : **Recharts 3** (depuis la Phase 3)

`package.json` inclut désormais `recharts` (^3.10). Décision prise et validée au début
de la Phase 3, après comparaison avec un SVG maison et visx :

- **Coût réel mesuré** : Recharts atterrit dans un chunk dédié de **402 kB brut /
  114 kB gzip**, référencé *uniquement* par `/dashboard/admin` (vérifié dans
  `.next/server/app/dashboard/(protected)/admin/page_client-reference-manifest.js`) —
  zéro impact sur `/login`, `/dashboard/startup`, `/dashboard/evaluateur` et les autres
  pages admin.
- **Ce qui a fait pencher la balance** : `accessibilityLayer` (activé par défaut en
  Recharts 3) pose `role="application"` + `tabIndex=0` sur le `<svg>` et fournit la
  navigation clavier point par point — le morceau le plus coûteux à écrire à la main.

Seul [`TimeseriesCard.tsx`](../src/components/dashboard/admin/dashboard/TimeseriesCard.tsx)
l'utilise aujourd'hui. Les autres visuels restent faits main et **n'ont pas été migrés** :
- Donut décisions : SVG custom (`DecisionsDonut.tsx`), `strokeDasharray`/`strokeDashoffset`.
- Barres pipeline / progression : `<div>` Tailwind en `style={{width}}`.

Pièges rencontrés, utiles si tu ajoutes un autre graphique :
- Recharts anime le tracé à l'entrée **en pilotant `stroke-dasharray`** : pendant ~2 s,
  l'attribut ne vaut pas la valeur déclarée. Tout test DOM doit attendre la stabilisation.
- En Recharts 3, le texte des ticks n'est **pas** imbriqué dans `.recharts-xAxis` (il vit
  dans des layers z-index séparés) — cible `.recharts-cartesian-axis-tick-value`.
- L'élément focusable est le `<svg>` `.recharts-surface`, pas le `div` `.recharts-wrapper`.
- La prop `title` n'est **pas** exposée sur les composants de chart (seulement `desc`) :
  le `role="application"` ne peut donc pas recevoir de nom accessible directement. On
  nomme la région englobante (`<figure aria-labelledby aria-describedby>`).

## 4. Data fetching : Context + fetch custom, pas de TanStack Query/SWR

`package.json` ne contient ni `@tanstack/react-query` ni `swr`. Le pattern réel :

- [`src/lib/api.ts`](../src/lib/api.ts) : wrapper central `apiFetch<T>()` (ligne 402),
  gère le header `Authorization`, le refresh automatique de token sur 401
  (`refreshAccessToken()` ligne 318), le stockage des tokens en `localStorage`. **Pas de
  cache de réponses.**
- Un contexte React par domaine (`StartupContext`, `ProgramContext`,
  `ApplicationContext`, `ApplicationEvaluatorContext`, `ProgramEvaluatorContext`,
  `EvaluationContext`, `IncubationFollowupsContext`, `NotificationContext`) : state local
  `useState`, `isXLoading`, `xError`, fonction `fetchX()` appelée manuellement dans un
  `useEffect` par les composants consommateurs. Pas de revalidation automatique, pas de
  `staleTime`/`keepPreviousData` — un refetch doit être déclenché explicitement.

→ **Gap à trancher avant la Phase 2** : le prompt de mission suppose une lib de
data-fetching déjà en place (`staleTime`, `keepPreviousData`, query keys structurées) —
elle n'existe pas. Introduire TanStack Query (candidat naturel, cité par le prompt) ou
étendre le pattern Context existant avec ces fonctionnalités à la main.

## 5. Thème et design tokens

Tailwind v4, **config 100% CSS** dans [`src/app/globals.css`](../src/app/globals.css)
(pas de `tailwind.config.*`). Tokens `:root` (lignes 4-47) surchargés sous `.dark`
(49-91), exposés via `@theme inline` (93-141).

Tokens disponibles : `background`, `foreground`, `card(-foreground)`,
`popover(-foreground)`, `primary(-foreground)`, `secondary(-foreground)`,
`muted(-foreground)`, `accent(-foreground)`, `destructive(-foreground)`, `border`,
`input`, `ring`, **`chart-1` à `chart-5`**, `sidebar*`, `background-accent`, `surface`,
`surface-strong`, `foreground-muted`, `brand(-strong/-contrast)`, `warning`,
`shadow-soft`, échelle `radius-*`.

⚠️ **`chart-1`…`chart-5` existent mais ne sont toujours utilisés nulle part**, et ce
n'est pas qu'un oubli : **leurs teintes changent complètement entre les thèmes**
(`chart-1` = orange en clair, bleu en sombre ; `chart-2` = navy → vert). Utilisés tels
quels dans un graphique, une série changerait de couleur au basculement du dark mode.
`TimeseriesCard` utilise donc des teintes fixes cohérentes avec le reste du dashboard
(`#3b82f6` candidatures, `#10b981` acceptations, `#f59e0b` délai moyen). **Dette
assumée** : réaligner les valeurs `.dark` de ces tokens sur les mêmes familles de teintes
que `:root` avant de les adopter.

Dark mode : **class-based, géré à la main** (pas de `next-themes`) —
`useState` + `localStorage["dashboard-dark-mode"]` + toggle de la classe `dark` sur
`document.documentElement`, dans `layout.tsx` (56-85), distribué via
`DashboardThemeContext`. ⚠️ `admin/page.tsx` n'utilise **pas** les classes `dark:` /
tokens CSS comme le reste de l'app (`startup/page.tsx`, `EvaluatorAssignedApplications.tsx`)
— il répète un pattern manuel `darkMode ? "..." : "..."` partout. Point de cohérence à
garder en tête si la page est retouchée en profondeur (règle de mission : ne pas casser
le design existant, mais l'harmoniser en le retouchant est légitime).

## 6. Auth côté frontend (bref)

- Rôle courant : `useAuth().user.role` (`src/contexts/AuthContext.tsx`).
- Routage par rôle : `getDashboardRoute()` (`src/lib/routeDashboard.ts`), protection par
  page via `RoleGuard` (`src/components/auth/Roleguard.tsx`).
- Tokens en `localStorage`, refresh automatique sur 401 dans `apiFetch()`
  (`src/lib/api.ts`), synchronisation multi-onglets via `CustomEvent`
  (`AUTH_TOKEN_UPDATED_EVENT`/`AUTH_SESSION_EXPIRED_EVENT`).

---

*Document à tenir à jour si la structure des contexts, le thème ou le stack de
data-fetching changent — sinon il devient trompeur.*
