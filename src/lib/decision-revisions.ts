import { applicationStatusLabel } from "./application-status";
import type { Decision, DecisionRevision } from "@/src/types/application";

/**
 * Lecture de l'historique des rectifications d'une decision.
 *
 * La table `DecisionRevision` etait ecrite par `reviseDecision` et relue par
 * personne : un admin qui revisait une decision ne pouvait plus retrouver ni ce
 * qui avait change, ni le motif qu'il avait lui-meme saisi. Le backend l'expose
 * desormais avec la decision, deja triee du plus recent au plus ancien.
 *
 * On retrie malgre tout ici : l'ordre d'affichage est une regle d'ecran, et il
 * ne doit pas dependre du `orderBy` d'une requete qu'un jour quelqu'un modifie.
 */
export function getDecisionRevisions(decision?: Decision | null): DecisionRevision[] {
  const revisions = decision?.revisions;

  if (!Array.isArray(revisions)) {
    return [];
  }

  return [...revisions]
    .filter((revision): revision is DecisionRevision => Boolean(revision?.id))
    .sort((left, right) => {
      const leftDate = new Date(left.revisedAt || 0).getTime();
      const rightDate = new Date(right.revisedAt || 0).getTime();

      return rightDate - leftDate;
    });
}

/** « Acceptée → Refusée », dans les libelles de l'UI. */
export function describeRevisionChange(revision: DecisionRevision): string {
  return `${applicationStatusLabel(revision.previousStatus)} → ${applicationStatusLabel(
    revision.newStatus,
  )}`;
}
