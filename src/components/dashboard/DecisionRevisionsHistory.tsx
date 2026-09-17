"use client";

import { History } from "lucide-react";
import { describeRevisionChange, getDecisionRevisions } from "@/src/lib/decision-revisions";
import type { Decision } from "@/src/types/application";

type DecisionRevisionsHistoryProps = {
  decision?: Decision | null;
  /**
   * L'admin voit qui a revise ; le candidat ne recoit pas ce champ et n'a donc
   * rien a afficher a cet endroit.
   */
  showAuthor?: boolean;
  className?: string;
};

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Historique des rectifications sous une decision. Rend `null` quand la
 * decision n'a jamais ete revisee : c'est le cas courant, et une section vide
 * ferait croire a une information manquante.
 */
export default function DecisionRevisionsHistory({
  decision,
  showAuthor = false,
  className = "",
}: DecisionRevisionsHistoryProps) {
  const revisions = getDecisionRevisions(decision);

  if (revisions.length === 0) {
    return null;
  }

  return (
    <div className={`border-t border-border/70 pt-2 ${className}`}>
      <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em]">
        <History className="h-3.5 w-3.5" />
        {revisions.length === 1 ? "1 révision" : `${revisions.length} révisions`}
      </p>

      <ol className="mt-2 space-y-2">
        {revisions.map((revision) => (
          <li className="text-xs leading-5" key={revision.id}>
            <span className="font-semibold">{describeRevisionChange(revision)}</span>
            {" - "}
            {formatDate(revision.revisedAt)}
            {showAuthor && revision.revisedBy?.email && (
              <>
                {" - par "}
                {revision.revisedBy.email}
              </>
            )}
            <span className="mt-0.5 block whitespace-pre-wrap text-sm opacity-90">
              {revision.reason}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
