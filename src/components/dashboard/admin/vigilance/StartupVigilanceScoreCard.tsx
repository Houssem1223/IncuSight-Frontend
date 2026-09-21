import {
  VIGILANCE_SCORE_DISCLAIMER,
  formatVigilanceScore,
  getVigilanceLevelLabel,
  getVigilanceLevelSentence,
  getVigilanceLevelTone,
} from "@/src/lib/startup-vigilance-view";
import type { VigilanceLevel } from "@/src/types/startup-vigilance";
import VigilanceBadge from "./VigilanceBadge";
import { Progress } from "@/src/components/ui/progress";

/**
 * Score déterministe d'un suivi.
 *
 * Volontairement sobre : le score est visible sans dominer la page comme un
 * score de crédit. Il est toujours accompagné de son libellé et de la phrase qui
 * rappelle qu'il ne prédit rien.
 */
export default function StartupVigilanceScoreCard({
  score,
  level,
}: {
  score: number;
  level: VigilanceLevel;
}) {
  return (
    <div className="inc-score-summary" data-tone={getVigilanceLevelTone(level)}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {formatVigilanceScore(score)}
        </p>
        <VigilanceBadge tone={getVigilanceLevelTone(level)}>
          Vigilance {getVigilanceLevelLabel(level).toLowerCase()}
        </VigilanceBadge>
        <Progress className="inc-score-meter" aria-hidden="true" value={score} indicatorClassName="inc-score-indicator" />
      </div>

      <p className="mt-3 text-sm text-foreground">{getVigilanceLevelSentence(level)}</p>

      <p className="mt-3 text-xs leading-5 text-foreground-muted">
        {VIGILANCE_SCORE_DISCLAIMER}
      </p>
    </div>
  );
}
