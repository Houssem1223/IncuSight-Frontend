import { Ban, CalendarClock, Clock, Minus, TrendingUp } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import { getVigilanceFactorRows } from "@/src/lib/startup-vigilance-view";
import type { VigilanceFactors } from "@/src/types/startup-vigilance";

/**
 * Les 5 facteurs qui composent le score.
 *
 * Chaque ligne porte une phrase métier : « 18 / 30 » seul ne dit rien à un
 * lecteur. Quand le facteur n'a pas pu être mesuré, la phrase le dit — un zéro
 * ne doit jamais être lu comme « aucun problème ».
 *
 * Aucune valeur n'est recalculée : `getVigilanceFactorRows` ne fait que
 * reformuler les mesures renvoyées par le backend.
 */
const icons = { overdueObjectives: CalendarClock, blockedObjectives: Ban, inactivity: Clock, progress: TrendingUp, stagnation: Minus };

export default function VigilanceFactorsCard({ factors }: { factors: VigilanceFactors }) {
  return (
    <div className="inc-factor-grid">
      {getVigilanceFactorRows(factors).map((row) => (
        <article
          className="py-3"
          key={row.key}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-sm font-medium text-foreground">{(() => { const Icon = icons[row.key]; return <Icon size={16} aria-hidden="true" />; })()}{row.label}</h4>
            <p className="shrink-0 text-sm font-semibold text-foreground">
              {row.score} / {row.maxScore}
            </p>
          </div>

          <Progress
            aria-hidden="true"
            className="mt-2 h-1"
            indicatorClassName={row.measured ? "bg-brand" : "bg-slate-300"}
            value={row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0}
          />

          <p
            className={`mt-2 text-xs leading-5 ${
              row.measured ? "text-foreground-muted" : "italic text-foreground-muted"
            }`}
          >
            {row.detail}
          </p>
        </article>
      ))}
    </div>
  );
}
