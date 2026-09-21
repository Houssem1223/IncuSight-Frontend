import {
  VIGILANCE_AI_NOTICE,
  getActionPriorityLabel,
  getAiSeverityTone,
  type EvidenceContext,
} from "@/src/lib/startup-vigilance-view";
import type { VigilanceSuggestedAction } from "@/src/types/startup-vigilance";
import EvidenceSources from "./EvidenceSources";
import VigilanceBadge from "./VigilanceBadge";

/**
 * Pistes d'accompagnement proposées par l'analyse.
 *
 * ⚠️ Ce sont des **suggestions à examiner**, rien d'autre. Ce composant n'expose
 * volontairement aucun bouton d'application : il ne crée pas d'objectif, ne
 * planifie pas de réunion et ne modifie pas le suivi. Un test verrouille cette
 * absence.
 */
export default function SuggestedActionsCard({
  actions,
  context,
}: {
  actions: VigilanceSuggestedAction[];
  context: EvidenceContext;
}) {
  if (actions.length === 0) {
    return (
      <p className="mt-2 text-sm italic text-foreground-muted">
        Aucune action d’accompagnement n’a été suggérée.
      </p>
    );
  }

  return (
    <>
      <div className="mt-3 grid gap-3">
        {actions.map((action) => (
          <article
            className="rounded-xl border border-border/75 bg-surface p-4"
            key={action.action}
          >
            <VigilanceBadge tone={getAiSeverityTone(action.priority)}>
              {getActionPriorityLabel(action.priority)}
            </VigilanceBadge>

            <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground">
              {action.action}
            </p>

            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
                Pourquoi
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {action.reason}
              </p>
            </div>

            <EvidenceSources context={context} refs={action.evidenceRefs} />
          </article>
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-foreground-muted">{VIGILANCE_AI_NOTICE}</p>
    </>
  );
}
