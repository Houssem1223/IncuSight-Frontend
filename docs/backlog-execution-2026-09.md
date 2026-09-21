# Exécution du backlog d'audit — septembre 2026

> Ce qui a réellement changé dans les deux dépôts en exécutant les backlogs des
> audits de septembre 2026 (documents de travail supprimés depuis : ce fichier est
> la seule trace durable de ce qui en est sorti). À lire après
> [`project-overview.md`](project-overview.md), avant de toucher au code : les
> pièges listés en §5 ont chacun coûté un bug.
>
> État : vagues 1 et 3 complètes, vague 2 complète sauf **V2-09** (stockage S3,
> bloqué faute de choix de fournisseur). Aucun endpoint ne renvoie plus 501.

## 1. Migrations Prisma ajoutées

Toutes additives, appliquées sur la base de dev.

| Migration | Contenu |
|---|---|
| `…_add_followup_attachments` | Table `FollowUpAttachment` (livrables joints à un point d'avancement) |
| `…_add_startup_branding` | `logoPath`/`logoOriginalName`/`logoMimeType`/`logoSize`/`logoUploadedAt`, `linkedinUrl`, `deckUrl` sur `StartupProfile` |
| `…_add_decision_revisions` | Table `DecisionRevision` (historique des rectifications de décision) |
| `…_add_startup_public_showcase` | `isPublicShowcase` sur `StartupProfile` |

## 2. Nouveaux modules backend

- **`reports`** — point unique des exports. PDF via `pdfkit` (grille d'évaluation,
  fiche de décision) et CSV sans dépendance (candidatures, startups, suivis).
  Le CSV utilise `;` et un BOM UTF-8 : c'est ce qu'attend Excel en locale FR.
- **`notifications/business-notification-email.service.ts`** — double d'email les
  notifications qui demandent une action ou portent une décision
  (`APPLICATION_ASSIGNED`, `DEADLINE_APPROACHING`, `DECISION_PUBLISHED`,
  `FEEDBACK_PUBLISHED`). Branché dans `createNotification`, hors chemin critique :
  une panne SMTP est journalisée, jamais propagée.

## 3. Changements de contrat d'API à connaître

| Avant | Après |
|---|---|
| `GET users/listeDesUtilisateurs` | `GET users` |
| `GET users/MyProfile` | `GET users/me` |
| `PATCH users/UpdateMyProfile` | `PATCH users/me` |
| `DELETE users/DesactivateMyAccount` | `DELETE users/me` |
| `PATCH users/activate/:id` | `PATCH users/:id/activate` |
| `PATCH users/Change My Password` (inatteignable) | `PATCH users/change-password` |

Autres ajouts : `POST incubation-followups/application/:applicationId`,
les routes de pièces jointes, `POST/GET startup/:id/logo`, `GET startup/public`,
`GET startup/public/:id/logo`, `PATCH application_evaluators/:applicationId/evaluators/:evaluatorId`
(échéance), `PATCH application/:id/decision/revise`, `GET business-rules`,
et les routes du module `reports`.

`GET /application` accepte désormais `status` et `programId` en plus de
`page`/`limit`.

## 4. Décisions de conception prises en cours de route

- **`notes` du suivi d'incubation reste interne.** Le DTO le documentait comme
  « notes internes de l'équipe d'incubation », mais il était renvoyé à la startup
  et affiché dans son écran. `findMine` l'exclut désormais par `omit`, et l'admin
  a enfin une UI pour l'écrire.
- **La vitrine publique est en opt-in explicite** (`isPublicShowcase`, `false` par
  défaut) et son `select` est énuméré à la main, jamais un `include` : la route
  n'a aucun garde.
- **SVG exclu des logos** — un SVG est un document exécutable ; le servir depuis
  une page publique ouvrirait une XSS stockée.
- **Réviser une décision ne supprime pas le suivi d'incubation existant** : il
  passe en `DROPPED`. Ses objectifs et comptes rendus sont du travail réel.
- **`FEEDBACK_PUBLISHED` est émis à la décision, si et seulement si un commentaire
  est joint.** Il n'existe aucune action « publier un retour » dans le produit :
  c'est le seul moment où un retour écrit devient lisible par le candidat. Deux
  notifications partent alors pour un seul clic — **point produit à confirmer**.

## 5. Pièges à ne pas reproduire

1. **Ordre des routes NestJS.** Toute route `module/<mot>` doit être déclarée
   **avant** `@Get(':id')` / `@Patch(':id')` : Express associe dans l'ordre de
   déclaration, et un segment unique est sinon capté par le paramètre. C'est ce
   qui rendait `users/Change My Password` inatteignable pour les trois rôles.
   Des commentaires de garde sont posés dans `users.controller.ts`,
   `incubation-followups.controller.ts` et `startup.controller.ts`.
2. **`omit` global Prisma et suppression de fichiers.** `pitchDeckPath`/`logoPath`
   sont masqués par défaut : une méthode qui a besoin du chemin doit le redemander
   (`omit: { pitchDeckPath: false }` ou un `select`), sinon elle lit `undefined` et
   laisse des fichiers orphelins sur le disque.
3. **`esModuleInterop` n'est pas activé** dans le tsconfig backend, mais
   `allowSyntheticDefaultImports` l'est : `import X from 'cjs-module'` **compile et
   casse à l'exécution** (`.default` vaut `undefined`). Forme correcte :
   `import X = require('...')`, comme pour `pdfkit`.
4. **Les normaliseurs des contexts React suppriment les champs non listés.**
   Ajouter un champ au backend ne suffit pas : il faut l'ajouter au normaliseur
   (`EvaluationContext#toStartup`, `ApplicationEvaluatorContext#toApplication`…).
   Piège rencontré trois fois.
5. **`QueryClientProvider` est monté dans le layout protégé**, pas dans le layout
   admin. Il ne l'était pas avant : toute page évaluateur ou startup appelant
   `useQuery` levait « No QueryClient set » à l'exécution, ce que `tsc` ne voit pas.
6. **Ajouter une dépendance à un service backend casse sa spec** tant qu'elle n'est
   pas mockée explicitement.
7. **Paginer sans filtrer côté serveur est un piège UX.** Un filtre appliqué après
   découpage ne montre que les correspondances de la page. C'est pourquoi `status`
   est passé au serveur, et pourquoi la recherche texte — qui n'a pas d'équivalent
   backend — est explicitement libellée « Recherche dans cette page ».
8. **Le loader de tests frontend était limité aux `.ts`.** Depuis la correction
   IA du 18/09, il accepte aussi `.tsx` et les alias `@/`, pour tester le rendu
   serveur React. Cela ne remplace pas un harnais DOM pour les interactions.
9. **Le compteur de non-lues ne se dérive pas d'une liste partielle.** Depuis le
   « charger plus », `notifications` ne contient plus forcément tout : recalculer
   `unreadCount` à partir de ce tableau écraserait le vrai total serveur par le
   total de la page (même piège que le socket, documenté dans le contexte). Tant
   qu'il reste des pages (`hasMoreRef`), c'est le serveur qui fait foi.

## 6. Corrections du contre-audit du 16/09 (frontend)

Faites le 17/09, frontend et backend :

- **États terminaux du suivi d'incubation** — règle partagée dans
  [`src/lib/incubation-followup-state.ts`](../src/lib/incubation-followup-state.ts) :
  hors `ACTIVE`, la startup ne peut plus publier de compte rendu ni faire avancer
  ses objectifs, l'admin ne peut plus créer/modifier d'objectif. Statut, phase et
  notes internes restent modifiables, sans quoi un suivi clos ne pourrait jamais
  être rouvert. ✅ **Le backend refuse désormais ces écritures** (17/09, 409
  `ConflictException` avec motif en français, sur compte rendu, progression
  d'objectif, création/modification d'objectif, ajout/suppression de pièce jointe).
  La garde d'interface reste utile pour expliquer le blocage, mais ce n'est plus
  elle qui protège.
- **`Notification.data` exploité** — commentaire de décision, programme, startup et
  échéance sont rendus dans le panneau
  ([`src/lib/notification-details.ts`](../src/lib/notification-details.ts)).
- **Notifications paginées** — « charger plus » par pages de 20, via `page`/`limit`
  et l'en-tête `X-Total-Count` (voir piège 9).
- **Historique des révisions de décision** — composant partagé
  [`DecisionRevisionsHistory`](../src/components/dashboard/DecisionRevisionsHistory.tsx),
  branché sous la décision dans la table admin **et** dans la liste des candidatures de
  la startup. L'admin voit qui a révisé (`revisedBy.email`), le candidat non — il ne
  reçoit simplement pas le champ. Tri refait côté écran
  ([`decision-revisions.ts`](../src/lib/decision-revisions.ts)) : l'ordre d'affichage
  est une règle d'écran, il ne doit pas dépendre du `orderBy` d'une requête.
- **Auteur d'un livrable** — `uploadedBy` rendu dans la timeline admin uniquement :
  seule une STARTUP dépose une pièce jointe, l'information ne renseigne donc que dans
  la vue partagée.
- `logoSize`/`logoUploadedAt` affichés dans la fiche startup, squelette du dashboard
  admin rendu responsive, `data-scroll-behavior="smooth"` posé sur `<html>`.
- Libellés de statut de candidature partagés
  ([`application-status.ts`](../src/lib/application-status.ts)) entre le panneau de
  notifications et l'historique des révisions — ils étaient réécrits à chaque écran.

## 6 bis. Contrats backend livrés le 17/09 (contre-audit, côté backend)

Détail complet dans `IncuSight-Backend/docs/dashboard-backend-context.md` §0 ter. Ce qui
concerne directement le frontend :

- **Historique des révisions de décision** — `decision.revisions[]` est désormais servi
  par `GET /application`, `GET /application/:id`, `GET /application/me` et
  `GET /application/me/:id`. Champs : `id`, `previousStatus`, `newStatus`, `reason`,
  `revisedAt`, plus `revisedBy { id, email }` **côté admin uniquement** — l'identité de
  l'admin décideur reste hors de la vue candidat, qui voit en revanche le motif et la
  date. Tri du plus récent au plus ancien. Sur le piège 4 : vérifié, `ApplicationContext`
  n'a **pas** de normaliseur — il sert la réponse de l'API telle quelle, donc rien à y
  ajouter. Celui qui filtre est `ApplicationEvaluatorContext#toApplication`, et il ne
  porte pas de décision (aucun écran évaluateur n'en affiche).
- **Suivi non `ACTIVE` → 409**, avec un message en français prêt à afficher. À
  distinguer d'un 403 : l'utilisateur a bien le droit, c'est l'état du suivi qui
  s'y oppose, et il peut changer.
- **Pièces jointes** : `uploadedById` et `uploadedBy { id, firstName, lastName, email }`
  sont exposés, `storagePath` toujours pas.
- **Routes publiques limitées en débit** : `GET /startup/public` et `GET /program/public`
  à 60 req/min par IP, `GET /startup/public/:id/logo` à 120 req/min (quotas séparés).
  Au-delà : 429 avec le message « Trop de demandes. Veuillez réessayer plus tard. » Le
  logo public renvoie `Cache-Control: public, max-age=300`.
- **Exports CSV plafonnés à 5 000 lignes**, avec une ligne d'avertissement en pied de
  fichier quand l'export est tronqué.

## 7. Ce qui reste ouvert

- **V2-09 — stockage de fichiers externalisé.** Trois répertoires sont concernés :
  `uploads/pitch-decks`, `uploads/followup-attachments`, `uploads/startup-logos`.
  Tant que c'est du disque local, aucun déploiement multi-instance n'est possible.
  Bloqué sur un choix de fournisseur S3-compatible.
- ~~**`npm run lint` du backend est cassé**~~ — réparé le 17/09 (flat config
  `eslint.config.js`, 0 erreur). Reste ~440 avertissements Prettier, tous
  auto-corrigés par le script, qui porte `--fix`.
- **Tests frontend sur les contexts React eux-mêmes** : toujours absents, seules
  les règles pures extraites en `src/lib/*.ts` sont couvertes.
