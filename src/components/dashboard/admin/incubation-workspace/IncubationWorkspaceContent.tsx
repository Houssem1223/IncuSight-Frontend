"use client";

import type { ComponentProps } from "react";
import { useIncubationTab } from "@/src/hooks/useIncubationTab";
import { useStartupVigilance } from "@/src/hooks/useStartupVigilance";
import IncubationStartupHeader from "./IncubationStartupHeader";
import IncubationTabs from "./IncubationTabs";
import OverviewTab from "./tabs/OverviewTab";
import NotesTab from "./tabs/NotesTab";
import ObjectivesSection from "../followups/ObjectivesSection";
import UpdatesTimeline from "../followups/UpdatesTimeline";
import StartupVigilancePanel from "../vigilance/StartupVigilancePanel";

type Props = Omit<ComponentProps<typeof IncubationStartupHeader>, "vigilance"> & {
  objectives: ComponentProps<typeof ObjectivesSection>;
  notes: ComponentProps<typeof NotesTab>;
};
export default function IncubationWorkspaceContent({ objectives, notes, ...header }: Props) {
  const { followUp } = header;
  const { tab, selectTab } = useIncubationTab();
  // One observed detail stays mounted across tabs. The panel shares its cache.
  const vigilance = useStartupVigilance(followUp.id);
  return <div className="inc-content">
    <div className="inc-context"><IncubationStartupHeader {...header} vigilance={vigilance.data} />
      <IncubationTabs tab={tab} onChange={selectTab} objectives={followUp.objectives?.length ?? 0} updates={followUp.updates?.length ?? 0} />
    </div>
    <div role="tabpanel" tabIndex={0} aria-labelledby={`inc-tab-${tab}`} id={`inc-panel-${tab}`} className="inc-tab-content">
      {tab === "overview" && <OverviewTab followUp={followUp} vigilance={vigilance.data} onNavigate={selectTab} />}
      {tab === "objectives" && <ObjectivesSection {...objectives} />}
      {tab === "journal" && <UpdatesTimeline updates={followUp.updates ?? []} />}
      {tab === "vigilance" && <StartupVigilancePanel followUp={followUp} followUpId={followUp.id} sharedDetail />}
      {tab === "notes" && <NotesTab {...notes} />}
    </div>
  </div>;
}
