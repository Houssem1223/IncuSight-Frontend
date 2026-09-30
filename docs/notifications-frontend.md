# Notifications — ouverture directe

Changement du 30 septembre 2026, frontend uniquement. Un clic sur une
notification la marque lue et ouvre la ressource concernée. La modal de détail
du header (« NOTIFICATION », titre, message, type, date, « Fermer ») est
supprimée, avec son état, son portail et le blocage du défilement associé.

## 1. Une seule logique

| Élément | Rôle |
|---|---|
| [`src/components/dashboard/notificationLinks.ts`](../src/components/dashboard/notificationLinks.ts) — `resolveNotificationHref` | Seul mapping identifiants + rôle → route. Inchangé. `null` = aucune cible |
| [`src/hooks/useNotificationActivation.ts`](../src/hooks/useNotificationActivation.ts) — `activate(notification, { onBeforeNavigate })` | Clic : marquer lue (si non lue) → fermer → naviguer ; verrou anti double clic ; repli sans navigation si pas de cible |
| [`src/contexts/NotificationContext.tsx`](../src/contexts/NotificationContext.tsx) — `markNotificationAsRead` | Désormais optimiste, avec restauration en cas d'échec |
| [`Header.tsx`](../src/components/dashboard/Header.tsx) | Menu de la cloche : chaque notification appelle `activate` |
| [`NotificationsPanel.tsx`](../src/components/dashboard/NotificationsPanel.tsx) | Page Notifications (lien de la sidebar) : « Consulter » appelle le même `activate` |

## 2. Types émis par le backend et destinations

Relevé dans `IncuSight-Backend` (lecture seule) : 9 types, tous émis avec au
moins un identifiant. Aucune modification backend n'a été nécessaire :
`GET notifications`, `GET notifications/unread-count`,
`PATCH notifications/:id/read`, `read-all` et `DELETE` existaient déjà.

| Type | Destinataire | Identifiants | Destination |
|---|---|---|---|
| `APPLICATION_SUBMITTED` | ADMIN | application, programme | `/dashboard/admin/applications?application=<id>` |
| `EVALUATION_SUBMITTED` | ADMIN | application, évaluation, programme | idem (dossier de la candidature) |
| `ALL_EVALUATIONS_COMPLETED` | ADMIN | application, programme | idem |
| `APPLICATION_ASSIGNED` | EVALUATOR | application, programme | `/dashboard/evaluateur/reviews` |
| `DEADLINE_APPROACHING` | EVALUATOR | application, évaluation, programme | `/dashboard/evaluateur/reviews` |
| `PROGRAM_ASSIGNED` | EVALUATOR | programme | `/dashboard/evaluateur/assignments` |
| `APPLICATION_UNDER_REVIEW` | STARTUP | application, programme | `/dashboard/startup/candidatures` |
| `DECISION_PUBLISHED` | STARTUP | application, programme, décision | `/dashboard/startup/candidatures` |
| `FEEDBACK_PUBLISHED` | STARTUP | application, programme, décision | `/dashboard/startup/candidatures` |

- L'écran admin « Synthèse reviews » choisit sa candidature par un sélecteur
  local, sans paramètre d'URL : aucun paramètre n'a été inventé, les
  notifications d'évaluation ouvrent le dossier de la candidature.
- Les pages évaluateur et startup ne lisent aucun paramètre : la destination est
  la liste concernée.
- Sans identifiant exploitable (ancienne ligne, type futur non mappé) :
  marquée lue, menu fermé, **aucune navigation**.

## 3. Lu / non lu et compteur

- Au clic : la notification passe « lue » et le compteur baisse immédiatement,
  avant la réponse du serveur.
- Le compteur reste celui du backend : dérivé de la liste quand elle est
  complète ; décrémenté puis relu (`unread-count`) quand la liste est paginée
  (« charger plus »), par exemple 33 → 32.
- Échec du `PATCH` : état restauré (la notification n'est pas lue côté serveur),
  erreur exposée par le contexte (`notificationsError`), **navigation
  conservée**, aucune erreur bloquante.
- Une notification déjà lue ne déclenche aucun appel.
- Menu du header : non lue = fond orange léger et pastille orange (+ « (non
  lue) » pour les lecteurs d'écran) ; lue = fond neutre. Textes lisibles en
  mode clair (ils utilisaient les couleurs du mode sombre).
- « Voir tout » renvoie vers la page Notifications du rôle.

## 4. Tests

- `tests/dom/notifications.dom.test.mjs` (9 tests, vrais `NotificationProvider`,
  `Header` et `NotificationsPanel`, API simulée) : non lue → compteur −1
  immédiat, menu fermé, navigation, aucune modal ; liste paginée 33 → 32 ;
  déjà lue ; sans cible ; double clic ; échec API ; « Voir tout » ; destinations
  évaluateur et startup ; page Notifications.
- `tests/visual/responsive/scenarios.mjs` : menu dans l'écran à 390 et 320 px,
  tap → navigation vers le dossier, aucune modal, aucun débordement.
