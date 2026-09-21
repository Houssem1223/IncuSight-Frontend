# Incubation Workspace — refonte frontend

Livraison du 21 septembre 2026. Route : `/dashboard/admin/incubation-followups`.

La seconde passe est livrée : voir [dashboard-ux-polish.md](dashboard-ux-polish.md)
pour la sidebar globale rétractable, les tokens sémantiques et les nouveaux
composants visuels. Les résultats de validation ci-dessous décrivent la première
passe ; l'état final est **289 tests** et **55 vues Chrome** aux sept résolutions.

## Audit avant refonte

L'écran empilait un grand header et ses cartes de statistiques, un formulaire de
création, un tableau de vigilance, puis une seconde liste de suivis et une colonne
contenant fiche startup, notes, vigilance complète, objectifs et journal. Deux
recherches distinctes coexistaient. La vigilance et les actions perdaient leur
contexte pendant le défilement. Il n'existait ni onglet, ni parcours mobile
liste/détail, ni création en modale.

## Architecture et fichiers créés

Le contrôleur `AdminIncubationFollowupsManagement` conserve les chargements et
mutations existants. Les nouvelles vues orchestrent les composants métier.

| Fichier sous `src/components/dashboard/admin/incubation-workspace/` | Rôle |
|---|---|
| `IncubationWorkspace.tsx` | Shell et mesure du header global pour le positionnement sticky |
| `IncubationStartupSidebar.tsx` | Unique liste de sélection, query paginée serveur, filtres et états locaux |
| `IncubationStartupItem.tsx` | Startup, programme, phase, progression représentative, vigilance et statut |
| `IncubationStartupHeader.tsx` | Contexte sélectionné, progression déclarée, score, contrôles phase/statut |
| `IncubationTabs.tsx` | Cinq onglets, compteurs, rôles ARIA et navigation clavier |
| `IncubationWorkspaceContent.tsx` | Montage du seul onglet actif et partage du cache de vigilance |
| `tabs/OverviewTab.tsx` | Synthèse, prochaine échéance, trois activités récentes et attention quantitative |
| `tabs/NotesTab.tsx` | Édition et enregistrement des notes existantes |
| `NewFollowUpDialog.tsx` | Création depuis une candidature acceptée, avec `FormModal` |

Autres fichiers créés :

- `src/hooks/useIncubationTab.ts` : lecture de `tab`, valeur de secours `overview`.
- `src/app/incubation-workspace.css` : styles du module, responsive et interactions.
- `tests/dom/incubation-fixtures.mjs` : jeux de données isolés pour les tests.
- `tests/dom/incubation-workspace.dom.test.mjs` : 33 tests d'interaction.
- `tests/visual/incubation-workspace.mjs` : contrôle du build dans Chrome.
- Ce document.

## Fichiers existants modifiés et composants réutilisés

| Fichier / groupe | Modification |
|---|---|
| `AdminIncubationFollowupsManagement.tsx` | Nouveau montage, statistiques compactes, création en dialogue, suppression du second filtre local ; invalidation de la liste après création/phase |
| `followups/ObjectivesSection.tsx` | Lignes séparées par des diviseurs et filtre de statut ; mêmes callbacks |
| `followups/UpdatesTimeline.tsx` | Tri récent → ancien, détails repliables, téléchargement des livrables conservé |
| `vigilance/VigilanceFilters.tsx` | Variante compacte ; mêmes champs, valeurs et debounce |
| `vigilance/StartupVigilancePanel.tsx` | Présentation dédiée à l'onglet ; option de partage du détail déjà observé |
| `vigilance/VigilanceAiAnalysis.tsx` | Synthèse visible et sous-sections repliables ; retrait de l'étoile décorative |
| `vigilance/VigilanceFactorsCard.tsx` | Facteurs présentés en lignes compactes |
| `hooks/useStartupVigilance.ts` | Option `sharedDetail` pour éviter un GET au remontage du panneau dans un onglet |
| `hooks/useSelectedFollowUp.ts`, `hooks/useVigilanceListParams.ts` | Historique natif Next pour les changements d'état client |
| `ui/forms/FormModal.tsx` | Portail dans `document.body`, hauteur limitée, scroll interne, titre accessible et gestion du focus |
| `ui/button.tsx` | Boutons secondaires basés sur les tokens du thème, lisibles en mode sombre |
| `src/app/layout.tsx` | Import des styles du workspace |
| `tests/typescript-loader.mjs` | Support des suffixes de query des mocks Node sur les fichiers TypeScript |
| `tests/dom/next-navigation-stub.mjs` | Intégration de l'historique natif dans le routeur de test |
| `tests/startup-vigilance.test.mjs`, `tests/startup-vigilance-render.test.mjs` | Invariants et libellé adaptés à la nouvelle composition |
| `CLAUDE.md`, `docs/project-overview.md`, `docs/startup-vigilance-frontend.md` | Index et description de l'architecture à jour |

`ObjectiveModal`, `ConfirmDialog`, les helpers de suivi, les enums, `VigilanceBadge`,
`VigilancePagination`, les composants de sources et de contenu IA, les contextes
et les clients API restent réutilisés. Aucun formulaire d'objectif n'est dupliqué.
`StartupVigilanceOverview` reste utilisé par l'overview admin ; son tableau n'est
plus monté en tête du module d'incubation.

Anciennes présentations supprimées : `FollowUpOverview.tsx`, `FollowUpsList.tsx`,
`StartFollowUpPanel.tsx` et `SummaryCards.tsx` du dossier `admin/followups/`.
Leurs actions utiles ont été transférées ; aucun ancien écran géant n'est caché.

## Navigation et présentation

- Desktop à partir de 1200 px : liste de 260 px (290 px avec menu global replié),
  défilement indépendant, contenu à droite. Header startup et onglets sticky.
- Tablette/mobile : liste puis détail, avec « Retour aux startups ». Les onglets
  défilent horizontalement. Sur petit mobile avec un dossier sélectionné, l'intro
  et les statistiques du module s'effacent pour laisser la place au contexte.
- Une URL sans `followUp` affiche une invitation à sélectionner. Une sélection
  explicite invalide ne bascule jamais silencieusement vers une autre startup.
- `followUp`, `tab`, filtres, pagination, tri et paramètres supplémentaires sont
  conservés. Les modifications explicites font `history.pushState`, les corrections
  automatiques de pagination font `replaceState`. Next 16 synchronise ces méthodes
  avec `useSearchParams` : pas de navigation serveur pour un changement de vue.
- Le reset des filtres ne supprime ni la startup ni l'onglet. Le statut serveur
  reste `ACTIVE` par défaut ; les quatre statuts se choisissent séparément.
- La création utilise toujours les candidatures ACCEPTED sans suivi existant.
  Après succès, le dialogue se ferme et le nouveau dossier est sélectionné.
  À la demande de l'utilisateur, la barre du module ne contient plus les boutons
  « Actualiser les suivis » et « Nouveau suivi » ; seul l'export CSV y reste.
  L'action de création des états vides et les boutons de réessai sont conservés.
- Overview : nombres réels, prochaine échéance d'un objectif ouvert, trois comptes
  rendus récents au maximum, deux facteurs mesurés d'attention au maximum. Les
  liens changent simplement d'onglet.
- Objectifs : tous / à faire / en cours / terminé / bloqué, ajout et modification
  avec le formulaire existant. Un suivi non actif garde le verrou existant.
- Journal : réalisation et progression visibles, détails des besoins/blocages/
  prochaines étapes à la demande. L'admin reste lecteur ; les livrables sont
  toujours téléchargeables.
- Vigilance : score quantitatif puis analyse qualitative ; synthèse visible,
  problèmes/signaux/attention/actions repliables, sources consultables. Aucune
  génération automatique. Les POST `analyze` et `refresh` gardent leur logique.
- Notes : brouillon conservé entre les onglets d'une même startup, remis à jour
  au changement de dossier ; même PATCH de sauvegarde, aucun historique inventé.
- Les formulaires d'objectif et de statut se ferment si l'historique change de
  dossier, pour empêcher de soumettre un brouillon sur une autre startup.
- Chargements, erreurs et états vides préservent le shell. Une erreur de vigilance
  n'empêche pas d'accéder aux objectifs, notes ou journal.

## Validation et limites

Résultats finaux : **271 tests réussis, 0 échec**, dont 33 nouveaux scénarios du
workspace ; **lint sans erreur ni avertissement**, **TypeScript sans erreur**,
**build Next réussi** (31 pages générées). Le build nécessite l'accès à Google
Fonts déjà utilisé par le projet ; il a été exécuté avec cet accès.

Dernière validation Chrome : **25 vues, aucun débordement horizontal, aucune
exception JavaScript non interceptée**. Le retour liste/détail et l'historique
Back/Forward ont aussi été exercés dans Chrome. Les captures ont été inspectées,
avec correction du contraste des boutons secondaires en mode sombre et réduction
du header mobile avant la dernière passe.

Captures et mesures de cette passe :
`C:\Users\USER\AppData\Local\Temp\incubation-visual-zqOzLr`.
Ce chemin est propre à la machine ; le script affiche un nouveau dossier à chaque
exécution. Le serveur de contrôle était le build de production sur le port 3106.

Les 33 nouveaux tests montent le vrai contrôleur, `IncubationFollowupsProvider`
et les composants avec Testing Library. Seuls l'authentification, les sources
application/programme, le routeur et les réponses HTTP sont simulés. Les tests
exercent les requêtes POST/PATCH réelles du client après les interactions.

Ils couvrent sélection, état vide de sélection, cinq onglets, URL et remontage,
Back/Forward, synthèse et liens, filtres d'objectifs, ajout/modification, verrou
du suivi clos, journal et accordéon, génération IA et sources, absence de requêtes
superflues, notes et isolation des dossiers, retour mobile, création, phase,
statut confirmé, recherche serveur, clavier, focus des modales, erreurs isolées
et refus de rendu pour un évaluateur.

Le script Chrome parcourt les cinq onglets à 1920×1080, 1440×900, 1366×768,
1024×768 et 390×844 : 25 vues. Il contrôle débordement horizontal, largeur utile,
visibilité de la sidebar, contexte sticky, retour mobile, mode sombre et modale.
Les captures et `checks.json` sont écrits dans un dossier temporaire indiqué par
le script. Aucune donnée réelle n'est modifiée et aucun backend n'est contacté.

Limites conservées ou explicites :

- Validation avec fixtures : elle ne remplace pas une recette avec le backend
  et les comptes réels, notamment pour les permissions et la génération IA.
- Le serveur de vigilance ne propose pas « tous les statuts » ; la recherche
  porte sur le nom de startup. Le programme utilise son filtre dédié, et la
  recherche locale par identifiant de l'ancienne seconde liste a été retirée.
- Le journal arrive avec le suivi, pas via une query indépendante : une panne du
  chargement du suivi ne peut pas être présentée comme une panne du seul journal.
- Pas d'historique de notes ni d'ajout de compte rendu admin : ces capacités ne
  sont pas introduites par une refonte de présentation.
- Sidebar globale rétractable ajoutée lors de la seconde passe : 272/72 px,
  tiroir sous 1280 px. Le repli de la liste contextuelle reste optionnel et absent.
- Génération IA synchrone inchangée. Aucun endpoint, DTO, calcul de vigilance,
  règle de statut ou schéma de base de données n'a été modifié.
