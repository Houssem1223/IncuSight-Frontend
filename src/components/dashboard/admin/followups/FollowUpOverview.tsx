"use client";

import { Badge } from "@/src/components/ui/badge";
import { Progress } from "@/src/components/ui/progress";
import type { IncubationFollowUp } from "@/src/types/incubation-followups";
import {
  followUpStatusClass,
  followUpStatusLabels,
  formatDate,
  getFollowUpLabel,
  getReportedProgress,
  phaseLabels,
} from "./followupHelpers";

type FollowUpOverviewProps = {
  followUp: IncubationFollowUp;
};

export default function FollowUpOverview({ followUp }: FollowUpOverviewProps) {
  const status = followUp.status || "ACTIVE";
  const progress = getReportedProgress(followUp);

  return (
    <section className="dashboard-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Fiche d’incubation</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {getFollowUpLabel(followUp)}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {followUp.program?.title || followUp.programId}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${followUpStatusClass(status)}`}>
          {followUpStatusLabels[status]}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dashboard-soft-block p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Phase</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {phaseLabels[followUp.phase || "ONBOARDING"]}
          </p>
        </article>
        <article className="dashboard-soft-block p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Démarrage</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {formatDate(followUp.startDate)}
          </p>
        </article>
        <article className="dashboard-soft-block p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Objectifs</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {followUp.objectives?.length || 0}
          </p>
        </article>
        <article className="dashboard-soft-block p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
            Comptes rendus
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {followUp.updates?.length || 0}
          </p>
        </article>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Progression globale</span>
          <span className="text-foreground-muted">{progress} %</span>
        </div>
        <Progress
          className="h-3"
          indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
          value={progress}
        />
      </div>

      {followUp.notes && (
        <p className="mt-5 rounded-xl border border-border/70 bg-white p-4 text-sm text-foreground-muted">
          {followUp.notes}
        </p>
      )}
    </section>
  );
}
