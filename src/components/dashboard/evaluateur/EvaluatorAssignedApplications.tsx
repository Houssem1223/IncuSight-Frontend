"use client";

import { useEffect, useMemo } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplicationEvaluators } from "@/src/contexts/ApplicationEvaluatorContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useProgramEvaluators } from "@/src/contexts/ProgramEvaluatorContext";
import type { Application } from "@/src/types/application";

function formatDate(value?: string): string {
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

  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

function readStringField(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" && value ? value : undefined;
}

function getMyEvaluationRecord(application: Application): Record<string, unknown> | null {
  const candidate = application["myEvaluation"];

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate as Record<string, unknown>;
}

function getReviewStatus(application: Application): string {
  const myEvaluation = getMyEvaluationRecord(application);
  const status = myEvaluation ? readStringField(myEvaluation, "status") : undefined;
  return normalizeStatus(status || application.status);
}

export default function EvaluatorAssignedApplications() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    myAssignedApplicationsByProgramId,
    isApplicationEvaluatorsLoading,
    applicationEvaluatorsError,
    clearApplicationEvaluatorsError,
    clearMyAssignedApplicationsByProgramCache,
    fetchMyAssignedApplicationsByProgram,
  } = useApplicationEvaluators();
  const {
    myPrograms,
    isProgramEvaluatorsLoading,
    programEvaluatorsError,
    clearProgramEvaluatorsError,
    fetchMyPrograms,
  } = useProgramEvaluators();

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    clearApplicationEvaluatorsError();
    clearProgramEvaluatorsError();
    clearMyAssignedApplicationsByProgramCache();

    void (async () => {
      try {
        const programs = await fetchMyPrograms();

        await Promise.all(
          programs.map((program) =>
            fetchMyAssignedApplicationsByProgram(program.id).catch(() => {
            }),
          ),
        );
      } catch {
      }
    })();
  }, [
    isAuthReady,
    isAuthenticated,
    clearApplicationEvaluatorsError,
    clearProgramEvaluatorsError,
    clearMyAssignedApplicationsByProgramCache,
    fetchMyPrograms,
    fetchMyAssignedApplicationsByProgram,
  ]);

  const groupedByProgram = useMemo(
    () =>
      [...myPrograms]
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((program) => {
          const applications = [...(myAssignedApplicationsByProgramId[program.id] || [])].sort(
            (left, right) => {
              const leftDate = new Date(left.createdAt || 0).getTime();
              const rightDate = new Date(right.createdAt || 0).getTime();

              return rightDate - leftDate;
            },
          );

          return {
            program,
            applications,
          };
        }),
    [myPrograms, myAssignedApplicationsByProgramId],
  );

  const flatApplications = useMemo(
    () => groupedByProgram.flatMap((group) => group.applications),
    [groupedByProgram],
  );

  const metrics = useMemo(() => {
    const pending = flatApplications.filter(
      (application) => getReviewStatus(application) === "PENDING",
    ).length;
    const inProgress = flatApplications.filter(
      (application) => getReviewStatus(application) === "IN_PROGRESS",
    ).length;
    const submitted = flatApplications.filter(
      (application) => getReviewStatus(application) === "SUBMITTED",
    ).length;

    return {
      pending,
      inProgress,
      submitted,
      totalApplications: flatApplications.length,
      totalPrograms: groupedByProgram.length,
    };
  }, [flatApplications, groupedByProgram]);

  const isLoading = isApplicationEvaluatorsLoading || isProgramEvaluatorsLoading;
  const combinedError = applicationEvaluatorsError || programEvaluatorsError;

  return (
    <RoleGuard allowedRole="EVALUATOR">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Evaluation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Mes candidatures affectees par programme
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Chaque programme est affiche une seule fois avec ses candidatures assignees.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Programmes</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.totalPrograms}</p>
          </article>

          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Candidatures</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.totalApplications}</p>
            <p className="mt-1 text-xs text-foreground-muted">Total assigne</p>
          </article>

          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Pending</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.pending}</p>
            <p className="mt-1 text-xs text-amber-700">A traiter</p>
          </article>

          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Submitted</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.submitted}</p>
            <p className="mt-1 text-xs text-emerald-700">Reviews soumises</p>
          </article>
        </div>

        <article className="dashboard-soft-block mt-6 p-4">
          <h2 className="text-base font-semibold text-foreground">Liste par programme</h2>
        
          {isLoading && (
            <div className="mt-4 space-y-2">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}

          {!isLoading && combinedError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {combinedError}
            </p>
          )}

          {!isLoading && !combinedError && groupedByProgram.length === 0 && (
            <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
              Aucune candidature affectee pour le moment.
            </p>
          )}

          {!isLoading && !combinedError && groupedByProgram.length > 0 && (
            <div className="mt-4 grid gap-3">
              {groupedByProgram.map((group) => (
                <article className="dashboard-card p-4" key={group.program.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{group.program.title}</h3>
                    <span className="inline-flex rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground-muted">
                      {group.applications.length} candidature{group.applications.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {group.applications.length === 0 && (
                    <p className="mt-3 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
                      Aucune candidature assignee dans ce programme.
                    </p>
                  )}

                  {group.applications.length > 0 && (
                    <div className="mt-3 grid gap-3">
                      {group.applications.map((application) => {
                        const reviewStatus = getReviewStatus(application);
                        const startupName = application.startup?.startupName || application.startupId;
                        const myEvaluation = getMyEvaluationRecord(application);
                        const assignedAt = readStringField(application, "assignedAt");
                        const scoreValue = myEvaluation ? myEvaluation["overallScore"] : undefined;
                        const recommendation = myEvaluation
                          ? readStringField(myEvaluation, "recommendation")
                          : undefined;
                        const score =
                          typeof scoreValue === "number" ? scoreValue : typeof scoreValue === "string" ? scoreValue : undefined;

                        return (
                          <div className="dashboard-soft-block p-3" key={application.id}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">Startup: {startupName}</p>
                                <p className="mt-1 text-xs text-foreground-muted">
                                  Cree le: {formatDate(application.createdAt)}
                                </p>
                                {assignedAt && (
                                  <p className="mt-1 text-xs text-foreground-muted">
                                    Assigne le: {formatDate(assignedAt)}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(reviewStatus)}`}
                              >
                                {reviewStatus}
                              </span>
                            </div>

                            {(score !== undefined || recommendation) && (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
                                {score !== undefined && (
                                  <span className="rounded-full border border-border bg-white px-2.5 py-1">
                                    Score: {score}
                                  </span>
                                )}
                                {recommendation && (
                                  <span className="rounded-full border border-border bg-white px-2.5 py-1">
                                    Recommendation: {recommendation}
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="mt-3 text-sm text-foreground-muted">
                              {application.motivationLetter || "Aucune lettre de motivation."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </RoleGuard>
  );
}
