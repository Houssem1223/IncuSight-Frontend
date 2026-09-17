import type { FollowUpStatus } from "@/src/types/incubation-followups";

/**
 * Etats terminaux d'un suivi d'incubation.
 *
 * `IncubationStatus` etait libelle et colore dans l'UI, mais aucun ecran n'en
 * tirait de consequence : une startup pouvait publier un compte rendu et faire
 * avancer ses objectifs sur un suivi `DROPPED`, et le `progress` recalcule
 * remontait dans les KPI de l'admin. Le cas est atteignable en production : une
 * revision de decision bascule le suivi en `DROPPED` pendant que la startup
 * continue de le voir.
 *
 * Regle unique, partagee par les deux ecrans : on n'ecrit que sur un suivi
 * `ACTIVE`. Le statut lui-meme (et les notes internes de l'admin) reste
 * modifiable, sans quoi un suivi clos ne pourrait jamais etre rouvert.
 */
// `satisfies` plutot qu'une annotation : garder le type litteral permet de
// narrower le statut dans les branches ci-dessous.
export const FOLLOW_UP_OPEN_STATUS = "ACTIVE" satisfies FollowUpStatus;

/** Statut effectif d'un suivi : l'absence de statut vaut `ACTIVE`, comme cote backend. */
export function resolveFollowUpStatus(status?: FollowUpStatus | null): FollowUpStatus {
  return status || FOLLOW_UP_OPEN_STATUS;
}

/** Vrai tant que le suivi accepte objectifs et comptes rendus. */
export function isFollowUpOpen(status?: FollowUpStatus | null): boolean {
  return resolveFollowUpStatus(status) === FOLLOW_UP_OPEN_STATUS;
}

const terminalStateLabels: Record<Exclude<FollowUpStatus, "ACTIVE">, string> = {
  COMPLETED: "Ce parcours d’incubation est terminé.",
  SUSPENDED: "Ce parcours d’incubation est suspendu.",
  DROPPED: "Ce parcours d’incubation a été abandonné.",
};

/**
 * Phrase affichee a la place des formulaires quand le suivi est ferme.
 * Renvoie `null` quand le suivi est ouvert : c'est le test a utiliser cote UI,
 * il evite de dupliquer la condition et le message.
 */
export function getFollowUpLockMessage(
  status: FollowUpStatus | undefined | null,
  audience: "STARTUP" | "ADMIN",
): string | null {
  const resolved = resolveFollowUpStatus(status);

  if (resolved === FOLLOW_UP_OPEN_STATUS) {
    return null;
  }

  const reason = terminalStateLabels[resolved];

  return audience === "STARTUP"
    ? `${reason} Vous ne pouvez plus publier de compte rendu ni modifier vos objectifs. Contactez l’équipe d’incubation si c’est une erreur.`
    : `${reason} Les objectifs et les comptes rendus sont figés. Repassez le suivi en « Actif » pour le rouvrir à l’écriture.`;
}
