# Dashboard et incubation — seconde passe UX/UI

Livraison du 21 septembre 2026, frontend uniquement. Ce document complète et
actualise la première passe décrite dans [incubation-workspace.md](incubation-workspace.md).

Ajustement demandé après recette : suppression des boutons « Actualiser les
suivis » et « Nouveau suivi » de la barre du module. L'export CSV y reste seul.
Les chargements initiaux, réessais et actions des états vides sont conservés.
Le bouton de repli global est désormais une icône seule dans la ligne de marque,
à droite d’IncuSight, avec une infobulle et un nom accessible ; sa ligne dédiée et
son texte visible ont été retirés. En rail, cette icône sert à rouvrir le menu.

## 1. Problèmes identifiés avant modification

Navigation globale fixe de 288 px, champ de recherche sans comportement, état
actif très saturé, libellés prenant toujours la même place. Le header global
occupait environ 76 px sur desktop et pouvait atteindre 128 px sur mobile.
Dans le suivi, des surfaces similaires rendaient le contexte difficile à
distinguer du contenu ; contrôles de phase/statut trop hauts, onglets peu
marqués, vigilance essentiellement textuelle, objectifs et journal peu structurés.

## 2. Design retenu et composants réutilisés

Une seule sidebar configurable, un header global compact et un workspace dont
la largeur s'adapte à la navigation. Le contexte startup utilise une surface
secondaire ; les couleurs renseignent un état, toujours accompagné d'un libellé.
Les détails du journal et les sources restent à la demande.

Réutilisation de `dashboardNavByRole`, des icônes Lucide, des contextes de
compteurs, des boutons, `Progress`, des champs et modales existants, ainsi que
des composants et helpers de vigilance. Aucun nouveau client API ou provider.
Les onglets et filtres gardent leur intégration à l'historique natif de Next 16.

## 3. Fichiers modifiés pendant cette seconde passe

| Fichier / chemin relatif | Modification |
|---|---|
| `src/app/dashboard/(protected)/layout.tsx` | État de repli partagé avec sidebar et largeur du contenu |
| `src/app/layout.tsx` | Chargement des styles globaux de dashboard |
| `src/components/dashboard/Sidebar.tsx` | Rail, recherche des rubriques, tiroir, compte, accessibilité |
| `src/components/dashboard/Header.tsx` | Header compact, hamburger, actions, dropdown responsive |
| `src/components/ui/button.tsx` | Actions primaires et texte au survol fondés sur des tokens contrastés |
| `src/app/incubation-workspace.css` | Densité, surfaces, composants, container queries, sticky |
| `admin/incubation-workspace/IncubationWorkspace.tsx` | Mesure du header global et du contexte pour le sticky et le focus |
| `admin/incubation-workspace/IncubationStartupItem.tsx` | Niveau coloré et progression représentative |
| `admin/incubation-workspace/IncubationStartupHeader.tsx` | Sélecteurs compacts, progression fine et vigilance |
| `admin/incubation-workspace/IncubationTabs.tsx` | Icônes et sélection visuelle |
| `admin/incubation-workspace/tabs/OverviewTab.tsx` | Mini-statistiques, priorité et échéance dépassée |
| `admin/incubation-workspace/tabs/NotesTab.tsx` | Présentation de l'espace de rédaction |
| `admin/followups/ObjectivesSection.tsx` | Compteurs de filtres, états et priorités sémantiques |
| `admin/followups/UpdatesTimeline.tsx` | Rail de dates et blocs sémantiques |
| `admin/vigilance/VigilanceBadge.tsx` | Palette partagée clair/sombre |
| `admin/vigilance/VigilanceFactorsCard.tsx` | Grille compacte et icônes |
| `admin/vigilance/StartupVigilanceScoreCard.tsx` | Score, niveau et explication regroupés |
| `admin/vigilance/VigilanceAiAnalysis.tsx` | Surface bleue légère, contenu et actions conservés |
| `admin/vigilance/EvidenceSources.tsx` | Sources repliées derrière un libellé et un décompte |
| `tests/visual/incubation-workspace.mjs` | Sept résolutions, rail, persistance, tiroir et thèmes |
| `CLAUDE.md`, `docs/project-overview.md`, `docs/incubation-workspace.md` | Index et état de validation actualisés |

Les chemins commençant par `admin/` sont relatifs à `src/components/dashboard/`.
Les autres modifications déjà présentes dans le répertoire ne sont pas toutes
issues de cette seconde passe ; aucune n'a été annulée.

## 4. Fichiers créés

- `src/hooks/useSidebarPreference.ts` : préférence persistante et breakpoint desktop.
- `src/components/ui/Tooltip.tsx` : infobulle au survol/focus, rendue par portail.
- `src/app/dashboard-shell.css` : layout, navigation et tokens sémantiques.
- `tests/dom/dashboard-sidebar.dom.test.mjs` : 18 tests DOM supplémentaires.
- `docs/dashboard-ux-polish.md` : ce rapport.

## 5. Tokens couleur

Les tokens existants `surface`, `background`, `foreground`, `border`, `brand` et
`foreground-muted` restent utilisés. Les nouveaux tokens sont centralisés dans
`dashboard-shell.css`, avec une valeur par thème.

| Famille | Clair : texte / fond | Sombre : texte / fond | Usage |
|---|---|---|---|
| `semantic-success` / `semantic-success-soft` | `#166748` / `#edf8f1` | `#8ce5b3` / `#1d3831` | LOW, réalisé, terminé |
| `semantic-info` / `semantic-info-soft` | `#215f99` / `#edf4fc` | `#9fc9ff` / `#20334e` | MEDIUM, progression, besoins, analyse |
| `semantic-warning` / `semantic-warning-soft` | `#95530a` / `#fff5e5` | `#f6ce83` / `#3d3325` | HIGH et priorité haute |
| `semantic-danger` / `semantic-danger-soft` | `#ad263c` / `#fdf0f2` | `#ffa8b3` / `#402c38` | CRITICAL, blocages, retard |
| `semantic-note` / `semantic-note-soft` | `#6251a8` / `#f3f0fc` | `#c6b7ff` / `#322f49` | Prochaines étapes |
| `surface-muted` | `#f7f9fc` | `#192435` | Contexte, statistiques, rédaction |
| `action-background` / `action-foreground` | `#c2410c` / `#ffffff` | `#fb923c` / `#172033` | Boutons primaires et compteur du header |
| `action-text` | `#9a3412` | `#fdba74` | Liens et actions secondaires |

La correspondance entre niveaux métier et tons provient toujours du helper
existant. Le ton nommé `neutral` dans ce contrat reste vert pour LOW.
Les douze couples texte/fond des cinq familles sémantiques et des actions,
dans les deux thèmes, ont un contraste calculé d'au moins **5,18:1**.

## 6–7. Largeurs de la sidebar globale

Ouverte : **272 px**. Repliée : **72 px**. Transition CSS de **200 ms**, désactivée
si l'utilisateur demande de réduire les animations. Le contenu libère la même
largeur sans changer son arbre React ni relancer les requêtes de vigilance.

## 8. Persistance

Clé `incusight-sidebar-collapsed`, valeurs `true` / `false`. Rendu serveur et
premier rendu client ouverts ; restauration dans un effet après hydratation.
Seul le clic de l'utilisateur écrit la préférence, pour éviter d'écraser une
valeur enregistrée lors du montage. Le hook écoute les changements de stockage.
Sans accès à localStorage, les contrôles fonctionnent pour la session courante.
Un test hydrate réellement un rendu serveur avec une préférence repliée.

## 9. Mobile et tablette

Sous **1280 px**, la navigation devient un tiroir de 272 px. La préférence desktop
reste mémorisée mais ne transforme jamais le tiroir en rail. Hamburger, fond
cliquable, bouton Fermer et Échap ; fermeture après clic sur une rubrique.
Le tiroir fermé est `inert`. Ouvert, il reçoit le focus, enferme la navigation
Tab, bloque le scroll du fond et rend le focus au contrôle précédent à sa fermeture.
Sous 1200 px, le workspace conserve son parcours liste puis détail.

## 10. Infobulles et compte

En rail, chaque lien a une icône de 20 px, un nom accessible et une infobulle
au survol comme au focus. Portail pour éviter le clipping, `role=tooltip`,
`aria-describedby`, fermeture par Échap. La recherche déplie le menu et place
le focus dans le champ. L'avatar ouvre le compte et la déconnexion ; Échap
ferme ce panneau et rend le focus à l'avatar. Les compteurs restent dynamiques.

## 11. Liste des startups

260 px avec menu global ouvert, 290 px avec rail ; noms plus forts, programme
secondaire, badge de phase, progression fine, badge de vigilance et statut. Aucun tri,
filtre ou score n'est recalculé localement. La progression représentative
indisponible ne reçoit pas de fausse valeur affichée. Recherche et pagination
restent branchées sur le serveur.

## 12. Header startup et header global

Nom et programme prioritaires, sélecteurs phase/statut compacts avec leurs
labels accessibles existants, progression déclarée et barre de 4 px, vigilance
avec score et niveau. Header global : **68 px**, **64 px** sur mobile. Date et
heure secondaires sur desktop, titre et actions sur une ligne sur mobile.
Le dropdown de notifications reste dans le viewport mobile.

## 13. Onglets

Icônes de 16 px, fond actif discret et soulignement orange, compteurs pour
objectifs/journal. Rôles tablist/tab/tabpanel, focus roving et touches fléchées,
Home/End conservés. Sur petit écran, seul le bandeau d'onglets défile horizontalement.

## 14. Vue d'ensemble

Quatre indicateurs issus du suivi : progression déclarée, phase avec démarrage,
objectifs réalisés, comptes rendus. Échéance et activité récente côte à côte
lorsque la largeur du panneau le permet ; attention en dessous. Trois activités
au maximum. Priorité de l'objectif et indication « En retard » si son échéance
précède le jour local courant : indication de date uniquement, sans intervenir
sur le délai de grâce ou le calcul du score de vigilance.

## 15. Objectifs

Lignes compactes sur surface secondaire, repère latéral par statut, priorité,
progression, échéance, date de mise à jour et action Modifier. Filtres segmentés
avec nombres par statut. Formulaires, callbacks et verrou des suivis clos conservés.

## 16. Journal

Rail de dates à gauche sur desktop, titre/auteur/progression puis réalisé à
droite. Sur mobile, date au-dessus de l'entrée. Réalisé vert, blocages rouges,
besoins bleus, prochaines étapes indigo. Les détails restent fermés au départ.
Livrables et gestion des erreurs de téléchargement sont conservés.

## 17. Vigilance et analyse

Score, niveau, barre fine proportionnelle au score reçu et explication regroupés ; facteurs en grille avec icônes,
mini-barres, valeurs et phrases métier. Analyse sur une surface bleue légère.
Synthèse visible, autres sections repliables. Suggestions gardant leur priorité
et leur justification ; sources derrière « Voir les sources », sans références
brutes. Aucun changement des règles de génération, de cache ou de rafraîchissement.

## 18. Notes

Espace de rédaction sobre, fond de saisie distinct, indication interne, état
enregistré/brouillon. Même sauvegarde et même conservation du brouillon lors
du changement d'onglet. Aucun historique de notes inventé.

## 19. Sticky, scroll et accessibilité

Le contexte observe explicitement `[data-dashboard-header]` et sa propre
hauteur. Il reste immédiatement sous le header global, sans interstice laissant
apparaître du contenu au-dessus. Marges de scroll pour les contrôles du panneau
afin de tenir compte du contexte fixe. Scroll de page et scroll de liste si
nécessaire ; aucune hauteur fixe ou troisième scroll dans le détail.
La navigation globale ne déborde plus horizontalement en rail. Focus visibles,
libellés accompagnant les couleurs, et animations réduites selon la préférence système.

## 20–24. Tests et validation

- **18 nouveaux tests DOM** : ouvert par défaut, repli/dépli, URL conservée,
  stockage et remontage, SSR/hydratation, stockage refusé, compteurs et actif,
  infobulles souris/clavier, recherche et focus, compte/déconnexion, Échap,
  tiroir, changement de viewport, isolation des rubriques STARTUP/EVALUATOR.
- **289 tests réussis, 0 échec**, répartis sur 17 fichiers `*.test.mjs`.
  Les 33 scénarios du workspace précédent restent exécutés et passent.
- **Lint** : aucune erreur ni avertissement.
- **TypeScript** : `tsc --noEmit` réussi.
- **Build** : `next build` réussi, 31 pages générées. Accès Google Fonts requis
  par la configuration existante et autorisé pour cette vérification.
- **Chrome** : 55 vues principales aux résolutions 1920×1080, 1600×900, 1440×900,
  1366×768, 1024×768, 768×1024 et 390×844, avec menu ouvert/replié sur desktop.
  Contrôle des dimensions, débordements, URL, absence de refetch lors du repli,
  préférence après rechargement, infobulle, compte, dropdown, tiroir, sticky,
  retour liste/détail et historique. Captures supplémentaires des onglets sombres,
  de l'analyse et de la modale. Script reproductible :
  `node tests/visual/incubation-workspace.mjs` après lancement du build sur 3106.
  La configuration `output: standalone` présente dans l'espace de travail a été
  conservée : la recette finale utilise `.next/standalone/server.js`, avec
  `.next/static` et `public` copiés dans le dossier de sortie, selon le mode de
  distribution standalone. La configuration de déploiement n'a pas été modifiée
  par cette passe UX.

Dernière recette : **55 vues, 0 débordement horizontal de page ou de navigation,
0 exception JavaScript non interceptée**. Captures inspectées en clair et sombre,
dont rail, tiroir, objectifs, journal, analyse et modale. Mesures et images :
`C:\Users\USER\AppData\Local\Temp\incubation-visual-fwKD5G`.
Ce dossier est temporaire et propre à la machine ; chaque exécution du script
produit un nouveau dossier et affiche son chemin.

Correspondance avec les 55 parties du brief :

| Parties | Résultat |
|---|---|
| 1–7 | Sidebar unique, 272/72 px, toggle, infobulles, persistance, tiroir, actif, icônes |
| 8–14 | Header global compact, largeur utile, contexte startup, badges et progressions |
| 15–20 | Onglets avec icônes, synthèse compacte, accents, échéance et activité récente |
| 21–24 | Objectifs structurés, filtres avec compteurs, timeline et détails repliés |
| 25–30 | Score et barre, facteurs, analyse distincte, suggestions/sources et notes |
| 31–39 | Tokens, surfaces, bordures, contrôles, densité, sticky et largeurs coordonnées |
| 40 | Option facultative de repli contextuel non retenue |
| 41–43 | Transitions discrètes, responsive, focus et sémantique accessible |
| 44 | Raccourci clavier facultatif non ajouté |
| 45–50 | Recherche, compte, compteurs, URL et logique existantes préservées, sans refetch de repli |
| 51–54 | 18 tests de sidebar, 33 scénarios de workspace conservés, 55 vues sur sept résolutions |
| 55 | Hiérarchie, densité et informations secondaires repliables vérifiées sur captures |

## 25. Limites restantes

Recette Chrome et DOM avec fixtures isolées, sans backend réel : cela ne valide
pas la disponibilité des services ni une génération réelle. Contrôles visuels
sous Chrome, sans certification d'accessibilité ni recette Safari/Firefox.
La recherche globale porte sur les rubriques de navigation, pas sur toutes les
données métier. Le repli optionnel de la liste contextuelle et un raccourci
Ctrl/Cmd+B ne sont pas ajoutés. Aucun endpoint, DTO, permission, schéma ou calcul
métier n'a été modifié ; la génération synchrone existante reste inchangée.
