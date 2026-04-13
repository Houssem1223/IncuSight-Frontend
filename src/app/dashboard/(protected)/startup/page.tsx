"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useStartups } from "@/src/contexts/StartupContext";
import type { Application } from "@/src/types/application";

type ApplyConfirmation = {
  programId: string;
  startupId: string;
  startupName: string;
  programTitle: string;
  motivationLetter: string;
};

type DeleteApplicationConfirmation = {
  applicationId: string;
  status: string;
  programLabel: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function normalizeStatus(status?: string) {
  return (status || "PENDING").toUpperCase();
}

function getStatusClass(status: string) {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function StartupDashboardPage() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { publicPrograms, isProgramsLoading, programsError, fetchPublicPrograms } = usePrograms();
  const { myStartups, fetchMyStartups } = useStartups();
  const {
    myApplications,
    isApplicationsLoading,
    applicationsError,
    fetchMyApplications,
    createApplication,
    removeMyApplication,
  } = useApplications();

  const [selectedStartupByProgram, setSelectedStartupByProgram] = useState<Record<string, string>>(
    {},
  );
  const [motivationByProgram, setMotivationByProgram] = useState<Record<string, string>>({});
  const [submittingProgramId, setSubmittingProgramId] = useState<string | null>(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const [applyConfirmation, setApplyConfirmation] = useState<ApplyConfirmation | null>(null);
  const [deleteApplicationConfirmation, setDeleteApplicationConfirmation] =
    useState<DeleteApplicationConfirmation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void Promise.all([fetchPublicPrograms(), fetchMyStartups(), fetchMyApplications()]).catch(() => {
    });
  }, [isAuthReady, isAuthenticated, fetchPublicPrograms, fetchMyStartups, fetchMyApplications]);

  const sortedPrograms = useMemo(
    () =>
      [...publicPrograms].sort((left, right) => {
        const leftDate = new Date(left.openDate).getTime();
        const rightDate = new Date(right.openDate).getTime();

        if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
          return 0;
        }

        if (Number.isNaN(leftDate)) {
          return 1;
        }

        if (Number.isNaN(rightDate)) {
          return -1;
        }

        return leftDate - rightDate;
      }),
    [publicPrograms],
  );

  const sortedMyApplications = useMemo(
    () =>
      [...myApplications].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();

        return rightDate - leftDate;
      }),
    [myApplications],
  );

  const applicationByProgramId = useMemo(() => {
    const map = new Map<string, Application>();

    for (const application of sortedMyApplications) {
      if (!map.has(application.programId)) {
        map.set(application.programId, application);
      }
    }

    return map;
  }, [sortedMyApplications]);

  const startupNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const startup of myStartups) {
      map.set(startup.id, startup.startupName);
    }

    return map;
  }, [myStartups]);

  const programTitleById = useMemo(() => {
    const map = new Map<string, string>();

    for (const program of publicPrograms) {
      map.set(program.id, program.title);
    }

    return map;
  }, [publicPrograms]);

  const resetActionFeedback = () => {
    setActionError(null);
    setActionMessage(null);
  };

  const handleApply = (programId: string) => {
    resetActionFeedback();

    const startupId = selectedStartupByProgram[programId] || myStartups[0]?.id;
    const motivationLetter = (motivationByProgram[programId] || "").trim();

    if (!startupId) {
      setActionError("You need at least one startup before applying.");
      return;
    }

    if (!motivationLetter) {
      setActionError("Motivation letter is required.");
      return;
    }

    const startupName = startupNameById.get(startupId) || startupId;
    const programTitle = programTitleById.get(programId) || programId;

    setApplyConfirmation({
      programId,
      startupId,
      startupName,
      programTitle,
      motivationLetter,
    });
  };

  const cancelApplyConfirmation = () => {
    if (submittingProgramId) {
      return;
    }

    if (applyConfirmation) {
      console.info("[application] user canceled submit", {
        programId: applyConfirmation.programId,
        startupId: applyConfirmation.startupId,
      });
    }

    setApplyConfirmation(null);
  };

  const confirmApply = async () => {
    if (!applyConfirmation) {
      return;
    }

    const { programId, startupId, motivationLetter } = applyConfirmation;

    console.info("[application] user confirmed submit", {
      programId,
      startupId,
    });

    setSubmittingProgramId(programId);

    try {
      await createApplication({
        startupId,
        programId,
        motivationLetter,
      });

      await fetchMyApplications();
      setMotivationByProgram((current) => ({
        ...current,
        [programId]: "",
      }));
      setActionMessage("Application submitted successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setSubmittingProgramId(null);
      setApplyConfirmation(null);
    }
  };

  const handleDeleteApplication = (application: Application) => {
    resetActionFeedback();

    const status = normalizeStatus(application.status);

    if (status !== "PENDING") {
      setActionError("Only pending applications can be deleted.");
      return;
    }

    setDeleteApplicationConfirmation({
      applicationId: application.id,
      status,
      programLabel:
        application.program?.title || programTitleById.get(application.programId) || application.programId,
    });
  };

  const cancelDeleteApplication = () => {
    if (deletingApplicationId) {
      return;
    }

    setDeleteApplicationConfirmation(null);
  };

  const confirmDeleteApplication = async () => {
    if (!deleteApplicationConfirmation) {
      return;
    }

    const { applicationId } = deleteApplicationConfirmation;

    setDeletingApplicationId(applicationId);

    try {
      await removeMyApplication(applicationId);
      setActionMessage("Application deleted successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete application.");
    } finally {
      setDeletingApplicationId(null);
      setDeleteApplicationConfirmation(null);
    }
  };

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          MEDIANET incubateur
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          L'incubateur d'innovation pour les startups
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Co-creation de valeur dans l'ecosysteme entrepreneurial tunisien. Choisis une startup
          et candidate aux programmes ouverts.
        </p>

        <Link
          className="dashboard-btn mt-5 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95"
          href="/dashboard/startup/applications"
        >
          Gerer mes startups
        </Link>

        <article className="dashboard-soft-block mt-6 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Programmes ouverts MEDIANET</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Candidate avec une seule startup par programme ouvert.
              </p>
            </div>
            <p className="text-sm text-foreground-muted">Total: {sortedPrograms.length}</p>
          </div>

          {isProgramsLoading && (
            <div className="mt-4 space-y-2">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}

          {!isProgramsLoading && programsError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {programsError}
            </p>
          )}

          {!isProgramsLoading && !programsError && sortedPrograms.length === 0 && (
            <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
              Aucun programme public disponible pour le moment.
            </p>
          )}

          {!isProgramsLoading && !programsError && sortedPrograms.length > 0 && (
            <div className="mt-4 grid gap-3">
              {sortedPrograms.map((program) => {
                const isOpen = program.isOpen;
                const existingApplication = applicationByProgramId.get(program.id);
                const startupId = selectedStartupByProgram[program.id] || myStartups[0]?.id || "";
                const motivationValue = motivationByProgram[program.id] || "";
                const status = normalizeStatus(existingApplication?.status);

                return (
                  <article className="dashboard-card p-4" key={program.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{program.title}</h3>
                        <p className="mt-1 text-sm text-foreground-muted">{program.description}</p>
                        <p className="mt-2 text-xs text-foreground-muted">
                          Ouverture: {formatDate(program.openDate)} | Cloture: {formatDate(program.closeDate)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isOpen ? "OPEN" : "CLOSED"}
                      </span>
                    </div>

                    <div className="mt-4">
                      {existingApplication ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}
                          >
                            Application: {status}
                          </span>
                          <span className="text-xs text-foreground-muted">
                            Startup: {startupNameById.get(existingApplication.startupId) || existingApplication.startupId}
                          </span>
                        </div>
                      ) : isOpen && myStartups.length > 0 ? (
                        <div className="grid w-full gap-2 sm:max-w-xl">
                          <textarea
                            className="min-h-24 rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                            onChange={(event) =>
                              setMotivationByProgram((current) => ({
                                ...current,
                                [program.id]: event.target.value,
                              }))
                            }
                            placeholder="Lettre de motivation"
                            value={motivationValue}
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                              onChange={(event) =>
                                setSelectedStartupByProgram((current) => ({
                                  ...current,
                                  [program.id]: event.target.value,
                                }))
                              }
                              value={startupId}
                            >
                              {myStartups.map((startup) => (
                                <option key={startup.id} value={startup.id}>
                                  {startup.startupName}
                                </option>
                              ))}
                            </select>
                            <button
                              className="dashboard-btn inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={submittingProgramId === program.id || !motivationValue.trim()}
                              onClick={() => {
                                void handleApply(program.id);
                              }}
                              type="button"
                            >
                              {submittingProgramId === program.id ? "Submitting..." : "Candidater"}
                            </button>
                          </div>
                        </div>
                      ) : isOpen ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-xl border border-border bg-slate-50 px-4 py-2 text-sm font-medium text-foreground-muted">
                            Cree une startup d'abord
                          </span>
                          <Link
                            className="dashboard-btn inline-flex rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                            href="/dashboard/startup/applications"
                          >
                            Ouvrir mes startups
                          </Link>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-xl border border-border bg-slate-50 px-4 py-2 text-sm font-medium text-foreground-muted">
                          Programme ferme
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        <article className="dashboard-soft-block mt-6 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Mes candidatures</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Suis le statut de tes candidatures et supprime celles qui sont en attente.
              </p>
            </div>
            <p className="text-sm text-foreground-muted">Total: {sortedMyApplications.length}</p>
          </div>

          {isApplicationsLoading && (
            <div className="mt-4 space-y-2">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}

          {!isApplicationsLoading && applicationsError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {applicationsError}
            </p>
          )}

          {!isApplicationsLoading && !applicationsError && sortedMyApplications.length === 0 && (
            <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
              Aucune candidature pour le moment.
            </p>
          )}

          {!isApplicationsLoading && !applicationsError && sortedMyApplications.length > 0 && (
            <div className="mt-4 grid gap-3">
              {sortedMyApplications.map((application) => {
                const status = normalizeStatus(application.status);
                const canDelete = status === "PENDING";
                const isDeleting = deletingApplicationId === application.id;

                return (
                  <article className="dashboard-card p-4" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {application.program?.title || programTitleById.get(application.programId) || application.programId}
                        </h3>
                        <p className="mt-1 text-sm text-foreground-muted">
                          Startup: {startupNameById.get(application.startupId) || application.startupId}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          Created: {formatDate(application.createdAt || "")}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <button
                        className="dashboard-btn rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={!canDelete || isDeleting}
                        onClick={() => {
                          handleDeleteApplication(application);
                        }}
                        type="button"
                      >
                        {isDeleting ? "Deleting..." : canDelete ? "Delete pending" : "Locked"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </article>

        {actionError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {actionMessage && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        )}
      </section>

      <ConfirmDialog
        cancelLabel="Back"
        confirmLabel="Confirm application"
        description={
          applyConfirmation
            ? `Apply to \"${applyConfirmation.programTitle}\" with startup \"${applyConfirmation.startupName}\"?`
            : undefined
        }
        isConfirming={Boolean(
          applyConfirmation && submittingProgramId === applyConfirmation.programId,
        )}
        isOpen={Boolean(applyConfirmation)}
        onCancel={cancelApplyConfirmation}
        onConfirm={() => {
          void confirmApply();
        }}
        title="Confirm your choice"
      />

      <ConfirmDialog
        cancelLabel="Keep application"
        confirmLabel="Delete pending"
        description={
          deleteApplicationConfirmation
            ? `This will delete your pending application for \"${deleteApplicationConfirmation.programLabel}\".`
            : undefined
        }
        isConfirming={Boolean(
          deleteApplicationConfirmation &&
            deletingApplicationId === deleteApplicationConfirmation.applicationId,
        )}
        isOpen={Boolean(deleteApplicationConfirmation)}
        onCancel={cancelDeleteApplication}
        onConfirm={() => {
          void confirmDeleteApplication();
        }}
        title="Delete pending application?"
        tone="danger"
      />
    </RoleGuard>
  );
}