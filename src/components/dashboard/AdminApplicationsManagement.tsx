"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Application } from "@/src/types/application";

const statusOptions = ["PENDING", "ACCEPTED", "REJECTED"] as const;
const statusFilterOptions = ["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const;

type StatusFilter = (typeof statusFilterOptions)[number];

type StatusUpdateConfirmation = {
  applicationId: string;
  currentStatus: string;
  nextStatus: string;
  programLabel: string;
  startupLabel: string;
};

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

function getProgramLabel(application: Application): string {
  if (application.program && typeof application.program.title === "string") {
    return application.program.title;
  }

  return application.programId;
}

function getStartupLabel(application: Application): string {
  if (application.startup && typeof application.startup.startupName === "string") {
    return application.startup.startupName;
  }

  return application.startupId;
}

export default function AdminApplicationsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    applications,
    isApplicationsLoading,
    applicationsError,
    clearApplicationsError,
    fetchAllApplications,
    updateApplicationStatus,
  } = useApplications();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [statusDraftByApplicationId, setStatusDraftByApplicationId] = useState<
    Record<string, string>
  >({});
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [statusUpdateConfirmation, setStatusUpdateConfirmation] =
    useState<StatusUpdateConfirmation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

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

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshApplications();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, 60000);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
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

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: applications.length,
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
    };

    for (const application of applications) {
      const status = normalizeStatus(application.status);

      if (status === "PENDING" || status === "ACCEPTED" || status === "REJECTED") {
        counts[status] += 1;
      }
    }

    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sortedApplications.filter((application) => {
      const program = getProgramLabel(application).toLowerCase();
      const startup = getStartupLabel(application).toLowerCase();
      const status = normalizeStatus(application.status).toLowerCase();
      const motivation = (application.motivationLetter || "").toLowerCase();
      const matchesStatus =
        statusFilter === "ALL" || normalizeStatus(application.status) === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        program.includes(query) ||
        startup.includes(query) ||
        status.includes(query) ||
        motivation.includes(query) ||
        application.id.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, sortedApplications, statusFilter]);

  const handleStatusUpdate = (application: Application) => {
    resetActionFeedback();

    const currentStatus = normalizeStatus(application.status);
    const nextStatus = (statusDraftByApplicationId[application.id] || currentStatus).toUpperCase();

    if (nextStatus === currentStatus) {
      setActionError("Select a different status before saving.");
      return;
    }

    setStatusUpdateConfirmation({
      applicationId: application.id,
      currentStatus,
      nextStatus,
      programLabel: getProgramLabel(application),
      startupLabel: getStartupLabel(application),
    });
  };

  const cancelStatusUpdate = () => {
    if (updatingApplicationId) {
      return;
    }

    if (statusUpdateConfirmation) {
      console.info("[admin-application] status update canceled", {
        applicationId: statusUpdateConfirmation.applicationId,
        currentStatus: statusUpdateConfirmation.currentStatus,
        nextStatus: statusUpdateConfirmation.nextStatus,
      });
    }

    setStatusUpdateConfirmation(null);
  };

  const confirmStatusUpdate = async () => {
    if (!statusUpdateConfirmation) {
      return;
    }

    const { applicationId, currentStatus, nextStatus } = statusUpdateConfirmation;

    console.info("[admin-application] status update confirmed", {
      applicationId,
      currentStatus,
      nextStatus,
    });

    setUpdatingApplicationId(applicationId);

    try {
      await updateApplicationStatus(applicationId, { status: nextStatus });
      await refreshApplications();
      setActionMessage("Application status updated successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update status.");
    } finally {
      setUpdatingApplicationId(null);
      setStatusUpdateConfirmation(null);
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Applications Directory
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {searchTerm.trim() || statusFilter !== "ALL"
                ? `Showing ${filteredApplications.length} of ${applications.length} applications`
                : `Total applications: ${applications.length}`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Search
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Program, startup, status, motivation..."
              type="text"
              value={searchTerm}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusFilterOptions.map((option) => {
            const isActive = statusFilter === option;

            return (
              <button
                className={`dashboard-btn rounded-xl border px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? "border-brand/30 bg-brand text-brand-contrast"
                    : "border-border bg-white text-foreground hover:border-brand/35 hover:text-brand-strong"
                }`}
                key={option}
                onClick={() => setStatusFilter(option)}
                type="button"
              >
                {option} ({statusCounts[option]})
              </button>
            );
          })}
        </div>

        {actionMessage && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        )}

        {actionError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {isApplicationsLoading && (
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {!isApplicationsLoading && applicationsError && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {applicationsError}
          </p>
        )}

        {!isApplicationsLoading && !applicationsError && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Program</th>
                    <th className="px-4 py-3 font-medium">Startup</th>
                    <th className="px-4 py-3 font-medium">Motivation</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-foreground-muted" colSpan={6}>
                        {searchTerm.trim()
                          ? "No matching applications found."
                          : "No applications found."}
                      </td>
                    </tr>
                  )}

                  {filteredApplications.map((application) => {
                    const currentStatus = normalizeStatus(application.status);
                    const selectedStatus =
                      statusDraftByApplicationId[application.id] || currentStatus;

                    return (
                      <tr className="border-t border-border/60" key={application.id}>
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
                              onChange={(event) =>
                                setStatusDraftByApplicationId((current) => ({
                                  ...current,
                                  [application.id]: event.target.value,
                                }))
                              }
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
                              disabled={updatingApplicationId === application.id}
                              onClick={() => handleStatusUpdate(application)}
                              type="button"
                            >
                              {updatingApplicationId === application.id ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ConfirmDialog
          cancelLabel="Cancel"
          confirmLabel="Apply status"
          description={
            statusUpdateConfirmation
              ? `Change status from ${statusUpdateConfirmation.currentStatus} to ${statusUpdateConfirmation.nextStatus} for ${statusUpdateConfirmation.startupLabel} in ${statusUpdateConfirmation.programLabel}?`
              : undefined
          }
          isConfirming={Boolean(
            statusUpdateConfirmation &&
              updatingApplicationId === statusUpdateConfirmation.applicationId,
          )}
          isOpen={Boolean(statusUpdateConfirmation)}
          onCancel={cancelStatusUpdate}
          onConfirm={() => {
            void confirmStatusUpdate();
          }}
          title="Confirm status change"
        />
      </section>
    </RoleGuard>
  );
}
