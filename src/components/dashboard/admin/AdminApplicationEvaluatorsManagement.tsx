"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplicationEvaluators } from "@/src/contexts/ApplicationEvaluatorContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import type { Application } from "@/src/types/application";
import type { User } from "@/src/types/user";

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
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getStartupLabel(application: Application): string {
  if (application.startup && typeof application.startup.startupName === "string") {
    return application.startup.startupName;
  }

  return application.startupId;
}

function evaluatorLabel(evaluator: User): string {
  const fullName = [evaluator.firstName, evaluator.lastName].filter(Boolean).join(" ").trim();
  return fullName ? `${fullName} (${evaluator.email})` : evaluator.email;
}

export default function AdminApplicationEvaluatorsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    programs,
    clearProgramsError,
    fetchAllPrograms,
  } = usePrograms();
  const {
    evaluatorsByApplicationId,
    availableEvaluatorsByApplicationId,
    adminApplicationsByProgramId,
    isApplicationEvaluatorsLoading,
    applicationEvaluatorsError,
    clearApplicationEvaluatorsError,
    clearAvailableEvaluatorsCache,
    clearAdminApplicationsByProgramCache,
    fetchAvailableEvaluatorsForApplication,
    fetchApplicationsByProgramForAdmin,
    assignApplicationEvaluator,
    removeApplicationEvaluator,
  } = useApplicationEvaluators();

  const [searchTerm, setSearchTerm] = useState("");
  const [assigningApplicationId, setAssigningApplicationId] = useState<string | null>(null);
  const [removingApplicationId, setRemovingApplicationId] = useState<string | null>(null);
  const [selectedEvaluatorByApplicationId, setSelectedEvaluatorByApplicationId] = useState<
    Record<string, string>
  >({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const refreshData = useCallback(async () => {
    clearProgramsError();
    clearApplicationEvaluatorsError();
    clearAvailableEvaluatorsCache();
    clearAdminApplicationsByProgramCache();

    try {
      await fetchAllPrograms();
    } catch {
    }
  }, [
    clearProgramsError,
    clearApplicationEvaluatorsError,
    clearAvailableEvaluatorsCache,
    clearAdminApplicationsByProgramCache,
    fetchAllPrograms,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refreshData();
  }, [isAuthReady, isAuthenticated, refreshData]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || programs.length === 0) {
      return;
    }

    void Promise.all(
      programs.map((program) =>
        fetchApplicationsByProgramForAdmin(program.id).catch(() => {
        }),
      ),
    );
  }, [
    isAuthReady,
    isAuthenticated,
    programs,
    fetchApplicationsByProgramForAdmin,
  ]);

  const applicationIds = useMemo(() => {
    const ids = new Set<string>();

    for (const applications of Object.values(adminApplicationsByProgramId)) {
      for (const application of applications) {
        ids.add(application.id);
      }
    }

    return [...ids];
  }, [adminApplicationsByProgramId]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || applicationIds.length === 0) {
      return;
    }

    void Promise.all(
      applicationIds.map((applicationId) =>
        fetchAvailableEvaluatorsForApplication(applicationId).catch(() => {
        }),
      ),
    );
  }, [
    isAuthReady,
    isAuthenticated,
    applicationIds,
    fetchAvailableEvaluatorsForApplication,
  ]);

  const groupedApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const groups = programs
      .map((program) => {
        const applicationsForProgram = adminApplicationsByProgramId[program.id] || [];
        const sortedApplications = [...applicationsForProgram].sort((left, right) => {
          const leftDate = new Date(left.createdAt || 0).getTime();
          const rightDate = new Date(right.createdAt || 0).getTime();
          return rightDate - leftDate;
        });

        const filtered = sortedApplications.filter((application) => {
          if (!query) {
            return true;
          }

          return (
            program.title.toLowerCase().includes(query) ||
            getStartupLabel(application).toLowerCase().includes(query) ||
            normalizeStatus(application.status).toLowerCase().includes(query) ||
            application.id.toLowerCase().includes(query)
          );
        });

        return {
          programId: program.id,
          programTitle: program.title,
          applications: filtered,
        };
      })
      .filter((group) => group.applications.length > 0);

    return groups;
  }, [programs, adminApplicationsByProgramId, searchTerm]);

  const totalApplications = useMemo(
    () => Object.values(adminApplicationsByProgramId).reduce((sum, items) => sum + items.length, 0),
    [adminApplicationsByProgramId],
  );

  const handleAssignEvaluator = async (applicationId: string) => {
    resetActionFeedback();
    const evaluatorId = selectedEvaluatorByApplicationId[applicationId];

    if (!evaluatorId) {
      setActionError("Selectionne un evaluateur avant l'affectation.");
      return;
    }

    setAssigningApplicationId(applicationId);

    try {
      await assignApplicationEvaluator(applicationId, evaluatorId);
      await fetchAvailableEvaluatorsForApplication(applicationId);
      setSelectedEvaluatorByApplicationId((current) => ({
        ...current,
        [applicationId]: "",
      }));
      setActionMessage("Evaluateur affecte a la candidature avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de l'affectation.");
    } finally {
      setAssigningApplicationId(null);
    }
  };

  const handleRemoveEvaluator = async (applicationId: string, evaluatorId: string) => {
    resetActionFeedback();
    setRemovingApplicationId(applicationId);

    try {
      await removeApplicationEvaluator(applicationId, evaluatorId);
      await fetchAvailableEvaluatorsForApplication(applicationId);
      setActionMessage("Evaluateur retire de la candidature avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec du retrait.");
    } finally {
      setRemovingApplicationId(null);
    }
  };

  return (
    <RoleGuard allowedRole="ADMIN">
      <section className="motion-rise dashboard-surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
              Administration
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Affectation des evaluateurs
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Affecte et retire des evaluateurs pour chaque candidature.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Search
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Program, startup, status, id..."
              type="text"
              value={searchTerm}
            />
          </div>
        </div>

        {actionMessage && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        )}

        {(actionError || applicationEvaluatorsError) && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError || applicationEvaluatorsError}
          </p>
        )}

        {isApplicationEvaluatorsLoading && totalApplications === 0 && (
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {!isApplicationEvaluatorsLoading && groupedApplications.length === 0 && (
          <p className="mt-6 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
            Aucune candidature disponible pour l&apos;affectation.
          </p>
        )}

        {groupedApplications.length > 0 && (
          <div className="mt-6 grid gap-3">
            {groupedApplications.map((group) => (
              <article className="dashboard-card p-4" key={group.programId}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">{group.programTitle}</h3>
                  <span className="inline-flex rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground-muted">
                    {group.applications.length} candidature{group.applications.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-3 grid gap-3">
                  {group.applications.map((application) => {
                    const assignedEvaluators = evaluatorsByApplicationId[application.id] || [];
                    const availableEvaluators =
                      availableEvaluatorsByApplicationId[application.id] || [];
                    const isAtMax = assignedEvaluators.length >= 2;

                    return (
                      <div className="dashboard-soft-block p-3" key={application.id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Startup: {getStartupLabel(application)}
                            </p>
                            <p className="mt-1 text-xs text-foreground-muted">
                              Cree le: {formatDate(application.createdAt)}
                            </p>
                          </div>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(normalizeStatus(application.status))}`}
                          >
                            {normalizeStatus(application.status)}
                          </span>
                        </div>

                        <div className="mt-3 rounded-lg border border-border/70 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                            Evaluateurs affectes ({assignedEvaluators.length}/2)
                          </p>

                          {assignedEvaluators.length === 0 && (
                            <p className="mt-2 text-sm text-foreground-muted">Aucun evaluateur affecte.</p>
                          )}

                          {assignedEvaluators.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {assignedEvaluators.map((evaluator) => (
                                <span
                                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs text-foreground"
                                  key={evaluator.id}
                                >
                                  {evaluator.email}
                                  <button
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-red-200 text-[10px] text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={removingApplicationId === application.id}
                                    onClick={() => handleRemoveEvaluator(application.id, evaluator.id)}
                                    type="button"
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {availableEvaluators.length > 0 && !isAtMax && (
                            <div className="mt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                                &Eacute;valuateurs autoris&eacute;s
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <select
                                  className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                                  onChange={(event) =>
                                    setSelectedEvaluatorByApplicationId((current) => ({
                                      ...current,
                                      [application.id]: event.target.value,
                                    }))
                                  }
                                  value={selectedEvaluatorByApplicationId[application.id] || ""}
                                >
                                  <option value="">Selectionner un evaluateur</option>
                                  {availableEvaluators.map((evaluator) => (
                                    <option key={evaluator.id} value={evaluator.id}>
                                      {evaluatorLabel(evaluator)}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={
                                    assigningApplicationId === application.id ||
                                    !selectedEvaluatorByApplicationId[application.id]
                                  }
                                  onClick={() => handleAssignEvaluator(application.id)}
                                  type="button"
                                >
                                  {assigningApplicationId === application.id ? "Affectation..." : "Affecter"}
                                </button>
                              </div>
                            </div>
                          )}

                          {availableEvaluators.length === 0 && !isAtMax && (
                            <p className="mt-2 text-xs text-foreground-muted">
                              Aucun evaluateur disponible pour ce programme.
                            </p>
                          )}

                          {isAtMax && (
                            <p className="mt-2 text-xs text-amber-700">
                              Cette candidature a deja le nombre maximum d&apos;evaluateurs.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </RoleGuard>
  );
}
