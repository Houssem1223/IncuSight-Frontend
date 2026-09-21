import { Progress } from "@/src/components/ui/progress";
import VigilanceBadge from "../vigilance/VigilanceBadge";
import { getVigilanceLevelTone } from "@/src/lib/startup-vigilance-view";
import type { StartupVigilanceListItem } from "@/src/types/startup-vigilance";
import { formatVigilanceProgress, getVigilanceLevelLabel, getVigilanceRepresentativeProgress } from "@/src/lib/startup-vigilance-view";
import { followUpStatusLabels, phaseLabels } from "../followups/followupHelpers";

export default function IncubationStartupItem({ item, selected, onSelect }: {
  item: StartupVigilanceListItem; selected: boolean; onSelect: (id: string) => void;
}) {
  const progress = getVigilanceRepresentativeProgress(item);
  return <button className="inc-startup-item" type="button" aria-pressed={selected}
    onClick={() => onSelect(item.followUpId)}>
    <span className="inc-item-name">{item.startupName}</span>
    <span className="inc-item-program">{item.programName}</span>
    <span className="inc-item-meta"><span className="inc-item-phase">{phaseLabels[item.phase]}</span><span>{formatVigilanceProgress(progress)}</span></span>
    {progress !== null && <Progress className="inc-item-progress" aria-hidden="true" value={progress} indicatorClassName="bg-brand" />}
    <span className="inc-item-meta"><VigilanceBadge tone={getVigilanceLevelTone(item.level)}>Vigilance {getVigilanceLevelLabel(item.level).toLocaleLowerCase("fr")}</VigilanceBadge><span>{followUpStatusLabels[item.status]}</span></span>
  </button>;
}
