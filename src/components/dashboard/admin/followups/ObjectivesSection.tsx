"use client";

import { useState } from "react";
import { CalendarDays, Clock3, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import type { FollowUpObjective } from "@/src/types/incubation-followups";
import {
  formatDate,
  objectiveStatusLabels,
  priorityLabels,
} from "./followupHelpers";

type ObjectivesSectionProps = {
  objectives: FollowUpObjective[];
  /** Faux des que le suivi quitte `ACTIVE` : un dossier clos ne se recadre plus. */
  isEditable: boolean;
  lockMessage: string | null;
  onAddObjective: () => void;
  onEditObjective: (objective: FollowUpObjective) => void;
};

export default function ObjectivesSection({
  objectives,
  isEditable,
  lockMessage,
  onAddObjective,
  onEditObjective,
}: ObjectivesSectionProps) {
  const [filter, setFilter] = useState("ALL");
  const visible = objectives.filter(objective => filter === "ALL" || (objective.status || "TODO") === filter);
  return (
    <section className="inc-objectives">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Objectifs</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Cadrez les livrables et suivez leur avancement.
          </p>
        </div>
        <Button disabled={!isEditable} onClick={onAddObjective} size="sm" type="button">
          <Plus className="h-4 w-4" />
          Ajouter un objectif
        </Button>
      </div>

      {lockMessage && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" />
          <span>{lockMessage}</span>
        </p>
      )}

      {objectives.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/75 bg-surface p-4 text-sm text-foreground-muted">
          Aucun objectif défini pour ce suivi.
        </p>
      )}

      <div className="inc-objective-filters" role="group" aria-label="Filtrer les objectifs">
        {[["ALL", "Tous"], ...Object.entries(objectiveStatusLabels)].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span aria-hidden="true">{key === "ALL" ? objectives.length : objectives.filter(o => (o.status || "TODO") === key).length}</span></button>)}
      </div>
      {!visible.length && objectives.length > 0 && <p className="text-sm text-foreground-muted">Aucun objectif pour ce statut.</p>}
      <div className="mt-4 divide-y divide-border">
        {visible.map((objective) => {
          const status = objective.status || "TODO";
          const priority = objective.priority || "MEDIUM";

          return (
            <article data-status={status} className="inc-objective-row" key={objective.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{objective.title}</h3>
                    <span
                      className="semantic-badge" data-tone={status === "DONE" ? "neutral" : status === "BLOCKED" ? "danger" : "info"}
                    >
                      {objectiveStatusLabels[status]}
                    </span>
                    <span className="inc-priority" data-priority={priority}>
                      Priorité {priorityLabels[priority].toLocaleLowerCase("fr")}
                    </span>
                  </div>
                  {objective.description && (
                    <p className="mt-2 text-sm text-foreground-muted">{objective.description}</p>
                  )}
                </div>
                <Button
                  disabled={!isEditable}
                  onClick={() => onEditObjective(objective)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Modifier
                </Button>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-foreground-muted">
                  <span>Progression</span>
                  <span>{objective.progress ?? 0} %</span>
                </div>
                <Progress
                  indicatorClassName={
                    status === "BLOCKED"
                      ? "bg-red-500"
                      : "bg-brand"
                  }
                  value={objective.progress ?? 0}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Échéance : {formatDate(objective.deadlineAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  Mis à jour : {formatDate(objective.updatedAt, true)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
