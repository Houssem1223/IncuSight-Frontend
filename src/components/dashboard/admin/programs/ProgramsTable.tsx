"use client";

import type { Program } from "@/src/types/program";
import type { User } from "@/src/types/user";
import { formatProgramDate } from "./programHelpers";
import ProgramEvaluatorAssignment from "./ProgramEvaluatorAssignment";

type ProgramsTableProps = {
  programs: Program[];
  hasSearchTerm: boolean;
  evaluatorsByProgramId: Record<string, User[]>;
  evaluatorUsers: User[];
  selectedEvaluatorByProgramId: Record<string, string>;
  assigningEvaluatorProgramId: string | null;
  removingEvaluatorProgramId: string | null;
  deletingProgramId: string | null;
  onEdit: (program: Program) => void;
  onDelete: (program: Program) => void;
  onSelectEvaluator: (programId: string, evaluatorId: string) => void;
  onAssignEvaluator: (programId: string) => void;
  onRemoveEvaluator: (programId: string, evaluatorId: string) => void;
};

export default function ProgramsTable({
  programs,
  hasSearchTerm,
  evaluatorsByProgramId,
  evaluatorUsers,
  selectedEvaluatorByProgramId,
  assigningEvaluatorProgramId,
  removingEvaluatorProgramId,
  deletingProgramId,
  onEdit,
  onDelete,
  onSelectEvaluator,
  onAssignEvaluator,
  onRemoveEvaluator,
}: ProgramsTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Programme</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {programs.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                  {hasSearchTerm ? "Aucun programme correspondant." : "Aucun programme."}
                </td>
              </tr>
            )}

            {programs.map((program) => {
              const description = program.description || "-";
              const openDate = formatProgramDate(program.openDate);
              const closeDate = formatProgramDate(program.closeDate);
              const assignedEvaluators = evaluatorsByProgramId[program.id] || [];
              const assignedEvaluatorIds = new Set(assignedEvaluators.map((evaluator) => evaluator.id));
              const availableEvaluators = evaluatorUsers.filter(
                (evaluator) => !assignedEvaluatorIds.has(evaluator.id),
              );

              return (
                <tr className="border-t border-border/60" key={program.id}>
                  <td className="px-4 py-3 text-foreground">{program.title}</td>
                  <td className="px-4 py-3 text-foreground-muted">{description}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {openDate}
                    <br />
                    <span className="text-xs">a {closeDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        program.isOpen
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {program.isOpen ? "Ouvert" : "Ferme"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                        onClick={() => onEdit(program)}
                        type="button"
                      >
                        Modifier
                      </button>
                      <button
                        className="dashboard-btn rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={deletingProgramId === program.id}
                        onClick={() => onDelete(program)}
                        type="button"
                      >
                        {deletingProgramId === program.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>

                    <ProgramEvaluatorAssignment
                      assignedEvaluators={assignedEvaluators}
                      availableEvaluators={availableEvaluators}
                      evaluatorUsersCount={evaluatorUsers.length}
                      isAssigning={assigningEvaluatorProgramId === program.id}
                      isRemoving={removingEvaluatorProgramId === program.id}
                      onAssign={() => onAssignEvaluator(program.id)}
                      onRemove={(evaluatorId) => onRemoveEvaluator(program.id, evaluatorId)}
                      onSelectEvaluator={(evaluatorId) => onSelectEvaluator(program.id, evaluatorId)}
                      selectedEvaluatorId={selectedEvaluatorByProgramId[program.id] || ""}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
