@AGENTS.md

## Avant toute exploration

Ce dépôt maintient un dossier `docs/` avec des documents de contexte écrits pour éviter
de ré-analyser tout le projet à chaque nouvelle mission. **Lis systématiquement le
contenu de `docs/` avant d'explorer le code**, et ne redécouvre que ce qui n'y est pas
déjà couvert.

Fichiers actuellement dans `docs/` :

- [`docs/project-overview.md`](docs/project-overview.md) — **à lire en premier** :
  vue d'ensemble du produit (métier, cycle de vie candidature→évaluation→décision→
  incubation), architecture des deux dépôts (frontend + backend), modèle de domaine
  Prisma complet, les 3 rôles utilisateurs et leurs routes, auth, stack technique
  exacte, état d'avancement global.
- [`docs/dashboard-frontend-context.md`](docs/dashboard-frontend-context.md) — pages
  dashboard par rôle, liste exhaustive des valeurs codées en dur (surtout
  `admin/page.tsx`), état du stack (pas de librairie de graphiques, pas de
  TanStack Query/SWR), tokens de thème disponibles, dark mode.
- [`docs/dashboard-backend-api-contract.md`](docs/dashboard-backend-api-contract.md) —
  contrat réel des 10 endpoints du module `dashboard` backend (8 actifs, 2 en 501),
  filtres communs, types partagés, écarts connus (`actionUrl` des insights vs routes
  frontend réelles).
- [`docs/dashboard-phase2-plan.md`](docs/dashboard-phase2-plan.md) — plan de la Phase 2
  de la mission dashboard (câblage admin, TanStack Query, filtres, drill-down) :
  décisions déjà tranchées, décisions encore ouvertes, table de remplacement bloc par
  bloc de `admin/page.tsx`.

Le pendant backend de ces documents vit dans `IncuSight-Backend/docs/dashboard-backend-context.md`
(dépôt sibling). D'autres documents viendront s'ajouter au fur et à mesure. Si un
document de `docs/` devient obsolète après un changement de code, mets-le à jour dans la
même tâche.
