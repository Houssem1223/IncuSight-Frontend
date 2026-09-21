import {
  getAiSeverityTone,
  getIssueSeverityLabel,
  getRecurrenceLabel,
  getVigilanceCategoryLabel,
  type EvidenceContext,
} from "@/src/lib/startup-vigilance-view";
import type { VigilanceIssue } from "@/src/types/startup-vigilance";
import EvidenceSources from "./EvidenceSources";
import VigilanceBadge from "./VigilanceBadge";

/**
 * Difficultés récurrentes relevées dans les points d'avancement.
 *
 * Récurrence et sévérité sont deux lectures distinctes de la même échelle : les
 * deux sont affichées en toutes lettres, jamais réduites à une couleur.
 * Les textes viennent du backend et ne sont jamais réécrits ici.
 */
export default function VigilanceIssues({
  context,
  issues,
}: {
  context: EvidenceContext;
  issues: VigilanceIssue[];
}) {
  if (issues.length === 0) {
    return (
      <p className="mt-2 text-sm italic text-foreground-muted">
        Aucune difficulté récurrente n’a été relevée.
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      {issues.map((issue) => (
        <article
          className="rounded-xl border border-border/75 bg-surface p-4"
          key={`${issue.category}-${issue.title}`}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
            {getVigilanceCategoryLabel(issue.category)}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-foreground">{issue.title}</h4>

          <div className="mt-2 flex flex-wrap gap-2">
            <VigilanceBadge tone={getAiSeverityTone(issue.recurrence)}>
              {getRecurrenceLabel(issue.recurrence)}
            </VigilanceBadge>
            <VigilanceBadge tone={getAiSeverityTone(issue.severity)}>
              {getIssueSeverityLabel(issue.severity)}
            </VigilanceBadge>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {issue.description}
          </p>

          <EvidenceSources context={context} refs={issue.evidenceRefs} />
        </article>
      ))}
    </div>
  );
}
