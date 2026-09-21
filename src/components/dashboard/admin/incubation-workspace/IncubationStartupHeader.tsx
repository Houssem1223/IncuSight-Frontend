import { Progress } from "@/src/components/ui/progress";
import { getVigilanceLevelTone } from "@/src/lib/startup-vigilance-view";
import { ArrowLeft } from "lucide-react";
import { FormSelect } from "@/src/components/ui/forms";
import type { FollowUpPhase, FollowUpStatus, IncubationFollowUp } from "@/src/types/incubation-followups";
import type { StartupVigilanceDetail } from "@/src/types/startup-vigilance";
import { getVigilanceLevelLabel } from "@/src/lib/startup-vigilance-view";
import { followUpStatuses, followUpStatusLabels, getFollowUpLabel, getReportedProgress, phases, phaseLabels } from "../followups/followupHelpers";

export default function IncubationStartupHeader({ followUp, vigilance, busy, onPhase, onStatus, onBack }: {
  followUp: IncubationFollowUp; vigilance?: StartupVigilanceDetail; busy: boolean;
  onPhase: (phase: FollowUpPhase) => void; onStatus: (status: FollowUpStatus) => void; onBack: () => void;
}) {
  return <header className="inc-startup-header">
    <button type="button" className="inc-back" onClick={onBack}><ArrowLeft size={16} />Retour aux startups</button>
    <div className="inc-startup-heading"><div><h2>{getFollowUpLabel(followUp)}</h2><p className="inc-program">{followUp.program?.title || followUp.programId}</p></div>
      <div className="inc-header-progress"><strong>{getReportedProgress(followUp)}<small> %</small></strong><span>Progression déclarée</span><Progress aria-hidden="true" className="inc-header-progress-bar" indicatorClassName="bg-brand" value={getReportedProgress(followUp)} /></div>
    </div>
    <div className="inc-startup-controls">
      <label><span>Statut</span><FormSelect aria-label="Changer le statut du suivi" value={followUp.status || "ACTIVE"} disabled={busy} onChange={e => onStatus(e.target.value as FollowUpStatus)}>{followUpStatuses.map(s => <option key={s} value={s}>{followUpStatusLabels[s]}</option>)}</FormSelect></label>
      <label><span>Phase</span><FormSelect aria-label="Changer la phase du suivi" value={followUp.phase || "ONBOARDING"} disabled={busy} onChange={e => onPhase(e.target.value as FollowUpPhase)}>{phases.map(p => <option key={p} value={p}>{phaseLabels[p]}</option>)}</FormSelect></label>
      <div className="inc-header-vigilance"><span>Vigilance</span><strong className={vigilance ? "semantic-badge" : ""} data-tone={vigilance ? getVigilanceLevelTone(vigilance.level) : undefined}>{vigilance ? `${vigilance.score}/100 · ${getVigilanceLevelLabel(vigilance.level)}` : "Non disponible"}</strong></div>
    </div>
  </header>;
}
