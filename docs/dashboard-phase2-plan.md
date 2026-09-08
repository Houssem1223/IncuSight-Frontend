# Plan Phase 2 — Câblage dashboard admin, filtres, drill-down

> Découle de la Phase 2 du prompt `prompt-claude-code-incusight-dashboard.md`, adapté à
> l'état réel de ce repo (voir `dashboard-frontend-context.md` pour l'audit complet) et
> au contrat réel du backend (`dashboard-backend-api-contract.md`). Ne remplace pas ces
> deux documents, les complète.

## Décisions déjà tranchées (ne pas rouvrir)

1. **Data-fetching : TanStack Query.** Aucune lib de cache/fetch n'existe (`ProgramContext`
   etc. sont du Context+useState fait main, sans staleTime/keepPreviousData). La mission
   demande explicitement staleTime + keepPreviousData + query keys structurées — c'est
   TanStack Query qui coche ces cases, et c'est la lib citée par défaut dans la mission.
   Les contexts existants (Application/Program/...) restent inchangés, TanStack Query
   n'est introduit QUE pour les nouveaux appels dashboard.
2. **Pas de nouvelle lib de charts en Phase 2.** Recharts (ou équivalent) est un sujet de
   Phase 3. En Phase 2, les visuels existants (donut SVG maison, barres Tailwind) restent
   tels quels dans leur forme, mais sont alimentés par les vraies données.
   > ✅ **Tranché depuis, en Phase 3** : Recharts 3 a été introduit pour le seul bloc
   > `TimeseriesCard` (`admin/timeseries`). Le donut et les barres n'ont **pas** été
   > migrés et restent faits main. Détails, coût de bundle mesuré et pièges Recharts 3 :
   > `dashboard-frontend-context.md` §3.
3. **`evaluator/overview` et `startup/overview` : hors périmètre.** Le backend y renvoie
   501 (Phase 4). Ne touche pas aux dashboards évaluateur/startup — ils sont déjà 100%
   dynamiques sur leurs propres sources (voir `dashboard-frontend-context.md` §1), aucune
   régression à risquer là-dessus.
4. **`admin/page.tsx` est la cible principale** (seul foyer de valeurs codées en dur,
   confirmé par grep sur tout `src/`). Le remplacer bloc par bloc, pas en un seul gros
   commit — cf. règle de mission "jamais de big bang".

## Décision à prendre EN DÉBUT DE PHASE (proposer un plan précis et attendre validation,
## comme le veut la Phase 0 de la mission — ne pas deviner)

**Le mapping `actionUrl` → route réelle** (table complète dans
`dashboard-backend-api-contract.md`) n'existe nulle part : ni route au bon chemin, ni
page qui lit les query params proposés par le backend (`objectiveStatus`, `stale`,
`programId`, `status`). Deux options, à trancher avant de coder le drill-down :

- **(a)** Construire les filtres réels sur les pages existantes (`applications`,
  `incubation-followups`) — ajouter la lecture de `status`/`programId` via
  `useSearchParams` — puis proposer une petite modification côté backend
  (`insights.rules.ts`, une poignée de lignes) pour que `actionUrl` pointe vers les
  vrais chemins. Nécessite une intervention (mineure) côté `IncuSight-Backend`.
- **(b)** Construire côté front une fonction `resolveInsightRoute(insight)` qui traduit
  les `actionUrl` backend actuels vers les vraies routes/filtres, sans toucher au
  backend. Plus rapide, mais la correspondance devient une dette à double maintenance
  si le backend change ses règles.

Recommandation : (a), c'est plus propre et le fix backend est trivial — mais c'est un
appel produit, pas seulement technique, donc pose la question avant d'implémenter le
drill-down des insights (les autres drill-down — pipeline, top-startups, activité — n'ont
pas ce problème, leurs cibles sont plus simples, voir plus bas).

## Ce qui va être implémenté

### 1. Client API dashboard typé
- `src/lib/dashboard-api.ts` : une fonction par endpoint (8 réels), toutes construites
  sur `apiFetch()` existant — aucune réinvention de la gestion du token/refresh.
- Les types TS = copie exacte des interfaces de `dashboard-backend-api-contract.md`
  (source de vérité), pas redérivés à la main.
- `buildDashboardQuery(filters)` : `URLSearchParams`, omet les clés `undefined`.

### 2. TanStack Query
- `QueryClientProvider` monté une fois (probablement dans
  `src/app/dashboard/(protected)/layout.tsx`, à côté des providers existants).
- Query keys structurées : `['dashboard', 'admin', '<endpoint>', filters]`.
- `staleTime` ≈ 30s (légèrement sous le TTL serveur de 45s, pour éviter de servir une
  donnée que TanStack croit fraîche alors que le serveur l'a déjà recalculée — sans non
  plus refetch à chaque render).
- `placeholderData: keepPreviousData` (API TanStack Query v5) sur tous les blocs pour
  éviter le clignotement au changement de filtre.
- Refetch on window focus activé sur `admin/activity` et `admin/insights` (blocs
  "temps réel" selon la mission), désactivé ou espacé sur le reste.

### 3. Filtres globaux (barre en haut de `admin/page.tsx`)
- Programme (select, source : contexte `Program` existant), Période (7j/30j/3mois/1an/
  personnalisé — `custom` affiche deux date pickers pour `from`/`to`), Statut (select à
  3 valeurs réelles : PENDING/ACCEPTED/REJECTED — **pas de 4e option "liste d'attente"**).
- État des filtres dans l'URL (`useSearchParams` + `router.replace`, pas de `useState`
  local isolé) : un dashboard filtré doit être copiable/partageable/rechargeable.
- Bouton "Réinitialiser" visible seulement si au moins un filtre diffère des défauts.
- Tous les blocs de la page consomment les mêmes filtres — aucun bloc oublié.

### 4. Remplacement bloc par bloc de `admin/page.tsx`
Reprend exactement la table de `dashboard-frontend-context.md` §2. Pour chaque ligne :
source réelle qui la remplace.

| Bloc actuel (codé en dur) | Remplacé par |
|---|---|
| Activité récente (5 events fake) | `admin/activity` → `activites[]` |
| Top startups (4 fake, score 94/91/88/85) | `admin/top-startups` → `classement[]` |
| Pipeline (barres, `/127` en dur) | `admin/pipeline` → `stages[]`, dénominateur = somme réelle |
| Répartition rôles (donut, total 243 en dur) | pas une source dashboard — si gardé, brancher sur l'endpoint users existant, sinon retirer le bloc (à trancher si aucune donnée réelle équivalente n'existe côté KPI utilisateurs — le module dashboard n'expose pas ce détail aujourd'hui) |
| Cibles KPI animées (applications/startups/conversion/active) | `admin/overview` → `candidatures`/`evaluations`, animation uniquement au premier chargement et désactivée si `prefers-reduced-motion` |
| Carte Applications (+12% en dur) | `admin/overview.candidatures.total` (PeriodComparison) |
| Carte Startups acceptées | `admin/overview.candidatures.acceptees` |
| Carte Délai moyen review | `admin/overview.evaluations.delaiMoyenJours` — **le composant de variation doit inverser sa couleur (`inverted`), une baisse de délai est une bonne nouvelle** |
| Carte Comptes actifs (91% en dur) | pas de source dans le module dashboard actuel (KPI "utilisateurs" du prompt de mission non implémenté en Phase 1, voir `dashboard-backend-context.md` §5 point 3 côté backend) — retirer ou remplacer par un placeholder assumé, ne pas réinventer un calcul côté front |
| Taux de conversion global (26.7% en dur) | `admin/overview.candidatures.tauxAcceptation` |
| Performance ce mois (4 cartes statiques) | pas de source directe — probablement à retirer ou à recomposer à partir de `admin/overview`, ne pas inventer |
| Badge "Live" | retiré ou requalifié (le vrai polling "LIVE" est un item de Phase 5, pas Phase 2 — ne pas laisser un badge trompeur en attendant) |
| `statusColors` (`pending/completed/success/warning/info`) | remplacer par les 3 vraies valeurs `ApplicationStatus` |

Deux blocs de la table ci-dessus n'ont pas d'équivalent direct dans les 8 endpoints
Phase 1 (comptes actifs, performance ce mois) : ne pas inventer de calcul côté front pour
compenser — soit les retirer pour cette phase, soit les signaler comme dette à couvrir
par un futur endpoint backend. Pose la question plutôt que de deviner un chiffre.

### 5. Drill-down
- Pipeline : chaque étape cliquable — nécessite la table de correspondance locale
  mentionnée dans `dashboard-backend-api-contract.md` (le label FR renvoyé par l'API
  n'est pas un filtre exploitable tel quel).
- Top-startups : chaque ligne → fiche startup (route déjà existante, à vérifier).
- Activité : chaque event → la ressource concernée (`applicationId`/`evaluationId`/...
  déjà fournis par l'API, exploitables directement).
- Insights : dépend de la décision (a)/(b) ci-dessus.
- `<Link>` réels partout (pas de `onClick` sur `<div>`), cf. règle de mission.

### 6. États d'interface (par bloc, pas globaux)
- Skeletons à la forme exacte du contenu final.
- Erreur : message + bouton réessayer, isolé par bloc (une carte en erreur ne casse pas
  le reste — `QueryErrorResetBoundary` de TanStack Query ou équivalent local).
- Vide : état actionnable (ex. "Aucune candidature sur cette période" + bouton qui élargit
  le filtre), pas un message d'excuse.

## Règles de travail (reprises de la mission, valables ici aussi)
- Petits incréments cohérents : après chaque bloc remplacé, l'app compile et tourne.
- Zéro valeur mockée résiduelle à la fin de cette phase, zéro `any`, zéro `console.log`.
- Ne casse pas la charte visuelle actuelle : on change la source des données, pas le design.
- Question plutôt qu'invention dès qu'une correspondance de données est ambiguë (cf. les
  deux blocs sans source directe ci-dessus, et la décision actionUrl).
