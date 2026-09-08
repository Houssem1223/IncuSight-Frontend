"use client";

import { CalendarDays, Clock3, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import type { FollowUpObjective } from "@/src/types/incubation-followups";
import {
  formatDate,
  objectiveStatusClass,
  objectiveStatusLabels,
  priorityLabels,
} from "./followupHelpers";

type ObjectivesSectionProps = {
  objectives: FollowUpObjective[];
  onAddObjective: () => void;
  onEditObjective: (objective: FollowUpObjective) => void;
};

export default function ObjectivesSection({
  objectives,
  onAddObjective,
  onEditObjective,
}: ObjectivesSectionProps) {
  return (
    <section className="dashboard-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Objectifs</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Cadrez les livrables et suivez leur avancement.
          </p>
        </div>
        <Button onClick={onAddObjective} size="sm" type="button">
          <Plus className="h-4 w-4" />
          Ajouter un objectif
        </Button>
      </div>

      {objectives.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
          Aucun objectif défini pour ce suivi.
        </p>
      )}

      <div className="mt-4 grid gap-3">
        {objectives.map((objective) => {
          const status = objective.status || "TODO";
          const priority = objective.priority || "MEDIUM";

          return (
            <article className="dashboard-card p-4" key={objective.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{objective.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${objectiveStatusClass(status)}`}
                    >
                      {objectiveStatusLabels[status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                      Priorité {priorityLabels[priority].toLocaleLowerCase("fr")}
                    </span>
                  </div>
                  {objective.description && (
                    <p className="mt-2 text-sm text-foreground-muted">{objective.description}</p>
                  )}
                </div>
                <Button
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
                      : "bg-gradient-to-r from-orange-500 to-amber-400"
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
