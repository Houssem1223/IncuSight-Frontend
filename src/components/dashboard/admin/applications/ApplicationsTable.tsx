"use client";

import { Fragment } from "react";
import DecisionRevisionsHistory from "@/src/components/dashboard/DecisionRevisionsHistory";
import type { Application } from "@/src/types/application";
import {
  formatDate,
  getProgramLabel,
  getStartupLabel,
  getStatusClass,
  normalizeStatus,
  statusOptions,
} from "./applicationHelpers";

type ApplicationsTableProps = {
  applications: Application[];
  hasSearchTerm: boolean;
  statusDraftByApplicationId: Record<string, string>;
  updatingApplicationId: string | null;
  exportingApplicationId: string | null;
  onStatusDraftChange: (applicationId: string, status: string) => void;
  onStatusUpdate: (application: Application) => void;
  onExportDecision: (application: Application) => void;
  onReviseDecision: (application: Application) => void;
};

export default function ApplicationsTable({
  applications,
  hasSearchTerm,
  statusDraftByApplicationId,
  updatingApplicationId,
  exportingApplicationId,
  onStatusDraftChange,
  onStatusUpdate,
  onExportDecision,
  onReviseDecision,
}: ApplicationsTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Programme</th>
              <th className="px-4 py-3 font-medium">Startup</th>
              <th className="px-4 py-3 font-medium">Motivation</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Cree le</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-foreground-muted" colSpan={6}>
                  {hasSearchTerm
                    ? "Aucune candidature correspondante trouvee."
                    : "Aucune candidature trouvee."}
                </td>
              </tr>
            )}

            {applications.map((application) => {
              const currentStatus = normalizeStatus(application.status);
              const selectedStatus = statusDraftByApplicationId[application.id] || currentStatus;
              const hasDecision = Boolean(application.decision);
              const decisionComment = application.decision?.comment?.trim();

              return (
                <Fragment key={application.id}>
                  <tr className="border-t border-border/60">
                    <td className="px-4 py-3 text-foreground">{getProgramLabel(application)}</td>
                    <td className="px-4 py-3 text-foreground-muted">{getStartupLabel(application)}</td>
                    <td className="max-w-[18rem] px-4 py-3 text-foreground-muted">
                      <p className="line-clamp-2">{application.motivationLetter || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(currentStatus)}`}
                      >
                        {currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">
                      {formatDate(application.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                          disabled={hasDecision}
                          onChange={(event) => onStatusDraftChange(application.id, event.target.value)}
                          value={selectedStatus}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <button
                          className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={updatingApplicationId === application.id || hasDecision}
                          onClick={() => onStatusUpdate(application)}
                          type="button"
                        >
                          {hasDecision
                            ? "Decision enregistree"
                            : updatingApplicationId === application.id
                              ? "Enregistrement..."
                              : "Enregistrer"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {hasDecision && (
                    <tr className="bg-slate-50/60">
                      <td className="px-4 pb-3 text-xs text-foreground-muted" colSpan={6}>
                        <span className="font-medium uppercase tracking-[0.14em]">
                          Decision {normalizeStatus(application.decision?.status)}
                        </span>
                        {" - "}
                        {formatDate(application.decision?.decidedAt)}
                        <button
                          className="dashboard-btn ml-3 rounded-lg border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:opacity-70"
                          disabled={exportingApplicationId === application.id}
                          onClick={() => onExportDecision(application)}
                          type="button"
                        >
                          {exportingApplicationId === application.id
                            ? "Generation..."
                            : "Fiche decision (PDF)"}
                        </button>
                        <button
                          className="dashboard-btn ml-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 hover:border-amber-300"
                          onClick={() => onReviseDecision(application)}
                          type="button"
                        >
                          Reviser
                        </button>
                        <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {decisionComment || "Aucun commentaire joint a cette decision."}
                        </span>
                        {/* `DecisionRevision` etait ecrite a chaque revision et relue
                            par personne : l'admin ne pouvait pas relire ce qu'il
                            avait lui-meme change, ni pourquoi. */}
                        <DecisionRevisionsHistory
                          className="mt-3"
                          decision={application.decision}
                          showAuthor
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
