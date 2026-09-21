# Analyse IA des évaluations — côté frontend

> Pendant frontend de `IncuSight-Backend/docs/AI_ANALYSIS.md`, qui reste la source de
> vérité du contrat (routes, statistiques, erreurs, confidentialité). Ce document ne
> décrit que ce que le frontend en fait. Rédigé le 2026-09-18.

## 1. Où ça vit

| Fichier | Rôle |
|---|---|
| [`src/types/ai-analysis.ts`](../src/types/ai-analysis.ts) | Types recopiés du contrat backend |
| [`src/lib/ai-analysis-api.ts`](../src/lib/ai-analysis-api.ts) | Les 3 appels, via `apiFetch` |
| [`src/lib/ai-analysis-query.ts`](../src/lib/ai-analysis-query.ts) | Options TanStack partagées, annulation des lectures et invalidation |
| [`src/lib/ai-analysis-view.ts`](../src/lib/ai-analysis-view.ts) | Règles d'affichage pures (testées) |
| [`src/hooks/useApplicationAiAnalysis.ts`](../src/hooks/useApplicationAiAnalysis.ts) | Query + 2 mutations TanStack Query |
| [`src/components/dashboard/admin/evaluations/ApplicationAiAnalysisCard.tsx`](../src/components/dashboard/admin/evaluations/ApplicationAiAnalysisCard.tsx) | Le rendu |
| [`tests/ai-analysis.test.mjs`](../tests/ai-analysis.test.mjs) | 29 tests de règles d'affichage et de client API |
| [`tests/ai-analysis-cache.test.mjs`](../tests/ai-analysis-cache.test.mjs) | 9 tests avec les vrais observers TanStack Query |
| [`tests/ai-analysis-render.test.mjs`](../tests/ai-analysis-render.test.mjs) | 6 tests du rendu React serveur de la carte |

**Emplacement dans l'UI** : `/dashboard/admin/application-evaluations`, sous la liste
des évaluations et les analyses rédigées par les évaluateurs
([`AdminApplicationEvaluationsManagement.tsx`](../src/components/dashboard/admin/AdminApplicationEvaluationsManagement.tsx)).
C'est le seul écran admin qui affiche le détail d'une candidature côté évaluations —
il n'existe pas de route `applications/[id]` dans ce dépôt. La section porte
`key={activeApplicationId}` : changer de candidature dans le sélecteur remet à zéro
l'état local (erreur de mutation, confirmation ouverte) au lieu de l'attribuer à la
candidature suivante.

L'action de décision vit sur un **autre écran** (`/dashboard/admin/applications`,
`DecisionModal`) : la séparation exigée entre l'aide IA et la décision est donc
structurelle, pas seulement visuelle. Le composant n'expose aucun bouton
« accepter/rejeter selon l'IA » et ne pré-remplit aucun formulaire — un test le
verrouille.

## 2. Contrat consommé

Trois routes, toutes `@Roles(ADMIN)` côté backend :

| Appel | Route | Effet |
|---|---|---|
| `getApplicationAiAnalysis` | `GET admin/applications/:id/ai-analysis` | Lecture seule, **jamais d'appel au modèle** |
| `generateApplicationAiAnalysis` | `POST admin/applications/:id/ai-analysis` | Génère si nécessaire, sinon sert le cache serveur |
| `refreshApplicationAiAnalysis` | `POST admin/applications/:id/ai-analysis/refresh` | Régénère, consomme du quota |

Le frontend ne parle **jamais** à Groq/Mistral/Ollama : aucune clé, aucun appel
direct. Chemin réel `Next.js → NestJS → AiService → providers`.

⚠️ **La réponse du GET est une union discriminée sur `status`**, pas un objet
optionnel : `READY` (payload complet) contre `NOT_GENERATED` / `STALE`
(`analysis: null` + `message`). `STALE` est un quatrième état à ne pas confondre avec
« pas d'analyse » : un résultat existe en base mais les évaluations ont changé depuis,
et le backend refuse de le servir plutôt que de laisser croire qu'il porte sur les
avis actuels.

⚠️ **Les notes sont sur l'échelle 1–5**, comme partout ailleurs dans le produit
(`src/lib/evaluation-scores.ts`). Les moyennes s'affichent « 3,5 / 5 » ; il n'y a
jamais de note à 8.

## 3. Décisions prises

- **Quelle mutation pour quel état.** `NOT_GENERATED` et `STALE` → `generate` (rien
  d'exploitable n'est détruit, aucune confirmation). `READY` → `refresh`, **avec
  confirmation** : cela remplace une analyse valide et consomme du quota chez le
  fournisseur, au même titre que la réouverture d'une évaluation sur cet écran, qui
  passe déjà par `ConfirmDialog`.
- **`setQueryData` plutôt qu'`invalidateQueries`** après une mutation : la réponse du
  POST *est* l'analyse à jour. L'invalider déclencherait un GET immédiat pour relire
  ce qu'on vient de recevoir. Les GET en cours sont annulés avant le POST et avant
  d'écrire sa réponse ; le signal d'annulation atteint `fetch`. Si le cache a changé
  pendant le POST, une relecture remplace cette écriture pour ne pas restaurer une
  analyse rendue périmée entre-temps.
- **Pas de retry automatique sur les mutations** (`retry: false`) : chaque tentative
  coûte du quota. Le réessai reste une décision de l'admin. La query, elle, garde un
  retry (une coupure réseau, ça se retente ; un 403, non).
- **Invalidation après réouverture d'une évaluation** : l'écran annule les lectures,
  remplace immédiatement un `READY` par `STALE`, puis relit le backend. Un échec de
  lecture ne restaure pas la synthèse périmée. Les autres candidatures sont intactes.
- **`staleTime` de 30 s, relecture au montage et au retour au premier plan**, sans
  polling : une soumission ou une régénération effectuée par un autre utilisateur
  peut aussi rendre le cache obsolète. Le GET ne consomme aucun appel au modèle.
- **L'ancienne analyse reste affichée pendant une actualisation** — la masquer ferait
  clignoter tout le bloc sans rien apprendre à personne.
- **`meta.fromCache`, `provider`, `model` ne sont pas affichés** : détail technique.
  `standardDeviation` et `normalizedDivergence` non plus en premier rideau — ils sont
  repliés dans un `<details>` « Détail technique » par critère divergent.
- **Aucune statistique n'est recalculée côté frontend.** Moyennes, écarts-types et
  sévérités viennent du backend ; le frontend met en forme, trie l'affichage et
  traduit.

## 4. Erreurs

`getAiAnalysisErrorMessage` traduit le `code` du corps d'erreur (lisible via
`ApiError.data`) en message métier. Les messages backend décrivent parfois la cause
technique (« le fournisseur a refusé la requête ») : ce n'est pas ce dont l'admin
fonctionnel a besoin. **Aucun nom de fournisseur, statut amont ni trace n'atteint
l'écran** — un test le vérifie explicitement.

| Code | Ce que voit l'admin |
|---|---|
| `AI_NO_SUBMITTED_EVALUATIONS` | « …disponible lorsqu'au moins une évaluation aura été soumise. » |
| `AI_INPUT_CHANGED` | « Les évaluations ont changé pendant l'analyse. Relancez la génération. » |
| `AI_INPUT_TOO_LARGE` | « Les évaluations sont trop volumineuses… » |
| `AI_INVALID_SUBMITTED_SCORES` | « …notes incomplètes : l'analyse ne peut pas être calculée. » |
| `AI_PROVIDER_REQUEST_FAILED`, `AI_UNAVAILABLE`, `AI_CONFIGURATION_ERROR` | « L'analyse intelligente est temporairement indisponible. Les évaluations restent accessibles normalement. » |
| `AI_RATE_LIMITED` | « …momentanément saturée. Réessayez dans quelques minutes. » |

Le dépôt n'a pas de système de toast : l'erreur s'affiche dans un encart rouge en tête
de section, avec `role="alert"`. En cas d'erreur du GET, « Réessayer le chargement »
relance uniquement ce GET. L'état vide exige une réponse réussie ; un échec de lecture
ne permet jamais d'affirmer qu'aucune analyse n'existe.

## 5. États couverts

| Situation | Rendu |
|---|---|
| 0 évaluation soumise (connu via la synthèse d'évaluations de l'écran) | Bouton désactivé + `aria-describedby` vers le message explicatif |
| Nombre d'avis pas encore chargé | Ne bloque pas à lui seul la génération ; la lecture IA doit d'abord réussir |
| Aucune analyse | « Aucune analyse IA n'a encore été générée. » + « Générer l'analyse » |
| Analyse périmée | Message dédié + « Actualiser l'analyse » |
| Chargement / génération | Skeleton + `role="status" aria-live="polite"`, `aria-busy` sur la section |
| Lecture en cours ou en erreur | Génération désactivée ; réessai de lecture proposé en cas d'erreur |
| 1 seule évaluation | Synthèse affichée, `divergenceStatus: INSUFFICIENT_EVALUATIONS` → « La détection des divergences nécessite au moins deux évaluations soumises. » |
| Aucune divergence significative | « Les évaluateurs convergent sur l'ensemble des critères. » |

Accessibilité : la sévérité est **toujours écrite en toutes lettres**
(`Faible divergence` / `Divergence modérée` / `Forte divergence`), la couleur n'est
qu'un renfort ; les listes portent un marqueur textuel. Deux colonnes
forces/faiblesses en `md:`, une seule en mobile.

## 6. Tests

Le loader accepte `.ts`, `.tsx` et les alias `@/`. Sans ajouter de dépendance, les
tests utilisent `react-dom/server` pour rendre la vraie carte, et `QueryObserver` /
`MutationObserver` pour exercer les options effectivement utilisées par les hooks.
Ils couvrent les réouvertures, les erreurs de relecture, les réponses GET tardives
avant et pendant un POST, et les réouvertures pendant une génération. Les règles
pures restent dans `ai-analysis-view.ts` et les appels réseau utilisent un `fetch`
simulé, comme dans `tests/api-refresh.test.mjs`.

Deux tests sont des invariants de source plutôt que des tests de rendu : « le composant
n'est importé que par un écran admin protégé par `RoleGuard` » et « la section ne
contient aucune action de décision ». Ils encodent les deux contraintes qu'un test
unitaire pur ne pourrait pas attraper.

## 7. Limites connues

- **Les interactions DOM ne sont pas automatisées** : le rendu serveur ne vérifie
  ni les clics, ni la gestion du focus, ni l'hydratation dans un navigateur.
- **Pas de synchronisation temps réel entre sessions** : les changements externes
  sont relus au montage et au retour au premier plan, sans polling permanent.
- **`meta.message` du backend n'est pas affiché tel quel** : le frontend a ses propres
  formulations pour les deux cas concernés. Si le backend en ajoute un troisième, il
  faudra le traiter ici (`getDivergenceNotice`).
- **La génération est synchrone** : l'appel HTTP attend la réponse du fournisseur (pas
  de streaming, pas de tâche de fond côté backend). Avec trois providers et des
  retries, l'attente peut être longue — le timeout du reverse proxy doit suivre.
- **Le type `AiEvaluationSummary`** est préfixé `Ai` parce que `EvaluationSummary`
  désigne déjà, dans `src/types/evaluation.ts`, la synthèse chiffrée des évaluations
  d'une candidature. Deux objets différents, ne pas les confondre.
