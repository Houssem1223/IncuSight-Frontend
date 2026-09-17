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
  dashboard par rôle (les trois sont branchées sur l'API, plus aucune valeur factice),
  stack réel de la couche dashboard (**Recharts 3** pour les graphiques,
  **TanStack Query** pour le fetch/cache, `QueryClientProvider` monté dans le layout
  protégé), pièges Recharts, tokens de thème et dark mode.
- [`docs/dashboard-backend-api-contract.md`](docs/dashboard-backend-api-contract.md) —
  contrat réel des 10 endpoints du module `dashboard` backend (les 10 renvoient des
  données réelles : `evaluator/overview` et `startup/overview` ne répondent plus 501),
  filtres communs, types partagés. Les `actionUrl` des insights pointent désormais vers
  de vraies routes des deux côtés.
- [`docs/dashboard-phase2-plan.md`](docs/dashboard-phase2-plan.md) — plan de la Phase 2
  de la mission dashboard (câblage admin, TanStack Query, filtres, drill-down) :
  décisions déjà tranchées, décisions encore ouvertes, table de remplacement bloc par
  bloc de `admin/page.tsx`. ⚠️ Document **historique** : la phase est livrée, il n'est
  plus une description de l'état actuel.
- [`docs/backlog-execution-2026-09.md`](docs/backlog-execution-2026-09.md) — ce qui a
  changé dans les deux dépôts en exécutant les backlogs des audits de septembre 2026
  (migrations, renommages de routes, décisions de conception) et surtout les
  **8 pièges à ne pas reproduire**, chacun ayant coûté un bug. À lire avant de
  toucher au code.

Le pendant backend de ces documents vit dans `IncuSight-Backend/docs/dashboard-backend-context.md`
(dépôt sibling). D'autres documents viendront s'ajouter au fur et à mesure. Si un
document de `docs/` devient obsolète après un changement de code, mets-le à jour dans la
même tâche.
