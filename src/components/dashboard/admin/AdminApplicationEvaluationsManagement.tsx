"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEvaluations } from "@/src/contexts/EvaluationContext";
import type { Application } from "@/src/types/application";

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(value?: string): string {
  return (value || "PENDING").toUpperCase();
}

function getStatusClass(status: string): string {
  if (status === "SUBMITTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "IN_PROGRESS") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getApplicationLabel(application: Application): string {
  const startup = application.startup?.startupName || application.startupId;
  const program = application.program?.title || application.programId;
  return `${startup} - ${program}`;
}

export default function AdminApplicationEvaluationsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    applications,
    clearApplicationsError,
    fetchAllApplications,
  } = useApplications();
  const {
    evaluationsByApplicationId,
    summariesByApplicationId,
    isEvaluationsLoading,
    evaluationsError,
    clearEvaluationsError,
    fetchEvaluationsByApplication,
    fetchApplicationSummary,
  } = useEvaluations();

  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");

  const refreshApplications = useCallback(async () => {
    clearApplicationsError();

    try {
      await fetchAllApplications();
    } catch {
    }
  }, [clearApplicationsError, fetchAllApplications]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refreshApplications();
  }, [isAuthReady, isAuthenticated, refreshApplications]);

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();

        return rightDate - leftDate;
      }),
    [applications],
  );

  const activeApplicationId = useMemo(() => {
    if (sortedApplications.length === 0) {
      return "";
    }

    const exists = sortedApplications.some((application) => application.id === selectedApplicationId);

    if (selectedApplicationId && exists) {
      return selectedApplicationId;
    }

    return sortedApplications[0].id;
  }, [sortedApplications, selectedApplicationId]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !activeApplicationId) {
      return;
    }

    clearEvaluationsError();
    void Promise.all([
      fetchEvaluationsByApplication(activeApplicationId),
      fetchApplicationSummary(activeApplicationId),
    ]).catch(() => {
    });
  }, [
    isAuthReady,
    isAuthenticated,
    activeApplicationId,
    clearEvaluationsError,
    fetchEvaluationsByApplication,
    fetchApplicationSummary,
  ]);

  const selectedApplication = useMemo(
    () => sortedApplications.find((application) => application.id === activeApplicationId) || null,
    [sortedApplications, activeApplicationId],
  );

  const applicationEvaluations =
    evaluationsByApplicationId[activeApplicationId] ||
    summariesByApplicationId[activeApplicationId]?.evaluations ||
    [];
  const summary = summariesByApplicationId[activeApplicationId];

  return (
    <RoleGuard allowedRole="ADMIN">
      <section className="motion-rise dashboard-surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
              Evaluation
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Synthese des reviews
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Consulte les evaluations par candidature et leurs moyennes.
            </p>
          </div>

          <div className="w-full max-w-lg">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Candidature
            </label>
            <select
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSelectedApplicationId(event.target.value)}
              value={activeApplicationId}
            >
              {sortedApplications.length === 0 && <option value="">Aucune candidature</option>}
              {sortedApplications.map((application) => (
                <option key={application.id} value={application.id}>
                  {getApplicationLabel(application)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedApplication && (
          <p className="mt-4 text-sm text-foreground-muted">
            Selection: {getApplicationLabel(selectedApplication)}
          </p>
        )}

        {evaluationsError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {evaluationsError}
          </p>
        )}

        {isEvaluationsLoading && activeApplicationId && (
          <div className="mt-4 space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {summary && (
          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Assignes</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.totalAssigned}</p>
            </article>
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Soumis</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.submittedCount}</p>
            </article>
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Score moyen</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.averageOverallScore ?? "-"}</p>
            </article>
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Favorable</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {summary.recommendations.FAVORABLE}
              </p>
            </article>
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Reserved</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {summary.recommendations.RESERVED}
              </p>
            </article>
            <article className="dashboard-card p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Unfavorable</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {summary.recommendations.UNFAVORABLE}
              </p>
            </article>
          </div>
        )}

        {!isEvaluationsLoading && activeApplicationId && applicationEvaluations.length === 0 && (
          <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
            Aucune evaluation trouvee pour cette candidature.
          </p>
        )}

        {!isEvaluationsLoading && applicationEvaluations.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Evaluateur</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Score global</th>
                    <th className="px-4 py-3 font-medium">Recommendation</th>
                    <th className="px-4 py-3 font-medium">Soumis le</th>
                  </tr>
                </thead>
                <tbody>
                  {applicationEvaluations.map((evaluation) => {
                    const status = normalizeStatus(evaluation.status);

                    return (
                      <tr className="border-t border-border/60" key={evaluation.id}>
                        <td className="px-4 py-3 text-foreground">
                          {evaluation.evaluator?.email || evaluation.evaluatorId || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {evaluation.overallScore ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {evaluation.recommendation || "-"}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatDate(evaluation.submittedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </RoleGuard>
  );
}
