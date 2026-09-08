"use client";

import type { Application } from "@/src/types/application";
import {
  formatDate,
  getProgramLabel,
  getStartupLabel,
  getStatusClass,
  normalizeStatus,
  statusOptions,
  type ApplicationStatusColumn,
} from "./applicationHelpers";

type ApplicationsKanbanProps = {
  applicationsByStatus: Record<ApplicationStatusColumn, Application[]>;
  statusDraftByApplicationId: Record<string, string>;
  updatingApplicationId: string | null;
  onStatusDraftChange: (applicationId: string, status: string) => void;
  onStatusUpdate: (application: Application) => void;
};

export default function ApplicationsKanban({
  applicationsByStatus,
  statusDraftByApplicationId,
  updatingApplicationId,
  onStatusDraftChange,
  onStatusUpdate,
}: ApplicationsKanbanProps) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {(Object.keys(applicationsByStatus) as ApplicationStatusColumn[]).map((columnStatus) => {
        const columnApplications = applicationsByStatus[columnStatus];

        return (
          <article className="dashboard-card p-4" key={columnStatus}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">{columnStatus}</h2>
              <span className="inline-flex rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground-muted">
                {columnApplications.length}
              </span>
            </div>

            {columnApplications.length === 0 && (
              <p className="mt-4 rounded-xl border border-dashed border-border/80 bg-slate-50 px-3 py-4 text-center text-xs text-foreground-muted">
                Aucun element dans cette colonne.
              </p>
            )}

            {columnApplications.length > 0 && (
              <div className="mt-4 space-y-3">
                {columnApplications.map((application) => {
                  const currentStatus = normalizeStatus(application.status);
                  const selectedStatus =
                    statusDraftByApplicationId[application.id] || currentStatus;
                  const hasDecision = Boolean(application.decision);

                  return (
                    <div
                      className="rounded-xl border border-border/75 bg-white p-3 shadow-sm"
                      key={application.id}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {getProgramLabel(application)}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Startup: {getStartupLabel(application)}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Cree le: {formatDate(application.createdAt)}
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs text-foreground-muted">
                        {application.motivationLetter || "-"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(currentStatus)}`}
                        >
                          {currentStatus}
                        </span>

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
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
