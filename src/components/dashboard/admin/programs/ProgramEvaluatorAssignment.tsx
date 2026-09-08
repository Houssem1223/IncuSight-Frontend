"use client";

import type { User } from "@/src/types/user";

function evaluatorLabel(evaluator: User): string {
  const fullName = [evaluator.firstName, evaluator.lastName].filter(Boolean).join(" ").trim();
  return fullName ? `${fullName} (${evaluator.email})` : evaluator.email;
}

type ProgramEvaluatorAssignmentProps = {
  assignedEvaluators: User[];
  availableEvaluators: User[];
  evaluatorUsersCount: number;
  selectedEvaluatorId: string;
  isAssigning: boolean;
  isRemoving: boolean;
  onSelectEvaluator: (evaluatorId: string) => void;
  onAssign: () => void;
  onRemove: (evaluatorId: string) => void;
};

export default function ProgramEvaluatorAssignment({
  assignedEvaluators,
  availableEvaluators,
  evaluatorUsersCount,
  selectedEvaluatorId,
  isAssigning,
  isRemoving,
  onSelectEvaluator,
  onAssign,
  onRemove,
}: ProgramEvaluatorAssignmentProps) {
  const canAssignEvaluator = !isAssigning && availableEvaluators.length > 0;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-slate-50 p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">
        Evaluateurs affectes ({assignedEvaluators.length})
      </p>

      {assignedEvaluators.length === 0 && (
        <p className="text-xs text-foreground-muted">Aucun evaluateur affecte.</p>
      )}

      {assignedEvaluators.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignedEvaluators.map((evaluator) => (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs text-foreground"
              key={evaluator.id}
            >
              {evaluatorLabel(evaluator)}
              <button
                className="ml-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isRemoving}
                onClick={() => onRemove(evaluator.id)}
                type="button"
              >
                {isRemoving ? "..." : "x"}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canAssignEvaluator}
          onChange={(event) => onSelectEvaluator(event.target.value)}
          value={selectedEvaluatorId}
        >
          <option value="">Selectionner un evaluateur</option>
          {availableEvaluators.map((evaluator) => (
            <option key={evaluator.id} value={evaluator.id}>
              {evaluatorLabel(evaluator)}
            </option>
          ))}
        </select>

        <button
          className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!selectedEvaluatorId || !canAssignEvaluator}
          onClick={onAssign}
          type="button"
        >
          {isAssigning ? "Affectation..." : "Affecter"}
        </button>
      </div>

      {availableEvaluators.length === 0 && evaluatorUsersCount > 0 && (
        <p className="text-xs text-foreground-muted">
          Tous les evaluateurs sont deja affectes a ce programme.
        </p>
      )}

      {evaluatorUsersCount === 0 && (
        <p className="text-xs text-foreground-muted">Aucun utilisateur evaluateur disponible.</p>
      )}
    </div>
  );
}
