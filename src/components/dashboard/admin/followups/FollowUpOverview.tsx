"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { FormSelect, FormTextarea } from "@/src/components/ui/forms";
import type {
  FollowUpPhase,
  FollowUpStatus,
  IncubationFollowUp,
} from "@/src/types/incubation-followups";
import {
  followUpStatuses,
  followUpStatusClass,
  followUpStatusLabels,
  formatDate,
  getFollowUpLabel,
  getReportedProgress,
  phaseLabels,
  phases,
} from "./followupHelpers";

type FollowUpOverviewProps = {
  followUp: IncubationFollowUp;
  onPhaseChange: (phase: FollowUpPhase) => void;
  onRequestStatusChange: (status: FollowUpStatus) => void;
  isUpdatingFollowUp: boolean;
  notesDraft: string;
  isSavingNotes: boolean;
  onNotesDraftChange: (value: string) => void;
  onSaveNotes: () => void;
};

export default function FollowUpOverview({
  followUp,
  onPhaseChange,
  onRequestStatusChange,
  isUpdatingFollowUp,
  notesDraft,
  isSavingNotes,
  onNotesDraftChange,
  onSaveNotes,
}: FollowUpOverviewProps) {
  const status = followUp.status || "ACTIVE";
  const phase = followUp.phase || "ONBOARDING";
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
        <div className="flex w-44 flex-col items-end gap-1.5">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${followUpStatusClass(status)}`}>
            {followUpStatusLabels[status]}
          </span>
          <FormSelect
            aria-label="Changer le statut du suivi"
            disabled={isUpdatingFollowUp}
            onChange={(event) => onRequestStatusChange(event.target.value as FollowUpStatus)}
            value={status}
          >
            {followUpStatuses.map((value) => (
              <option key={value} value={value}>
                {followUpStatusLabels[value]}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="dashboard-soft-block p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Phase</p>
          <FormSelect
            aria-label="Changer la phase du suivi"
            className="mt-2"
            disabled={isUpdatingFollowUp}
            onChange={(event) => onPhaseChange(event.target.value as FollowUpPhase)}
            value={phase}
          >
            {phases.map((value) => (
              <option key={value} value={value}>
                {phaseLabels[value]}
              </option>
            ))}
          </FormSelect>
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

      <div className="mt-5 rounded-xl border border-border/70 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Notes internes</p>
          <p className="text-xs text-foreground-muted">
            Visibles par l&apos;équipe de l&apos;incubateur uniquement.
          </p>
        </div>

        <FormTextarea
          className="mt-2"
          disabled={isSavingNotes}
          onChange={(event) => onNotesDraftChange(event.target.value)}
          placeholder="Points de vigilance, contexte, historique d'échanges..."
          rows={3}
          value={notesDraft}
        />

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            disabled={isSavingNotes || notesDraft === (followUp.notes ?? "")}
            onClick={onSaveNotes}
            size="sm"
            type="button"
            variant="outline"
          >
            {isSavingNotes ? "Enregistrement…" : "Enregistrer les notes"}
          </Button>
          {notesDraft !== (followUp.notes ?? "") && !isSavingNotes && (
            <span className="text-xs text-foreground-muted">Modifications non enregistrées</span>
          )}
        </div>
      </div>
    </section>
  );
}
