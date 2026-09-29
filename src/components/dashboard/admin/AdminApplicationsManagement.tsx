"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { downloadApplicationsCsv, downloadDecisionReport } from "@/src/lib/reports";
import { useAuth } from "@/src/contexts/AuthContext";
import { fetchApplicationDetail, fetchApplicationList } from "@/src/lib/application-list";
import { applicationStatusLabel } from "@/src/lib/application-status";
import { DEFAULT_PAGE_SIZE, getPageCount } from "@/src/lib/pagination";
import type { Application } from "@/src/types/application";
import {
  getProgramLabel,
  getStartupLabel,
  normalizeStatus,
  statusFilterOptions,
  viewModeOptions,
  type ApplicationStatusColumn,
  type StatusFilter,
  type ViewMode,
} from "./applications/applicationHelpers";
import ApplicationsKanban from "./applications/ApplicationsKanban";
import ApplicationsTable from "./applications/ApplicationsTable";
import DecisionModal, { type StatusUpdateConfirmation } from "./applications/DecisionModal";
import ReviseDecisionModal from "./applications/ReviseDecisionModal";

const finalDecisionStatuses = ["ACCEPTED", "REJECTED"] as const;

function getInitialStatusFilter(searchParams: URLSearchParams): StatusFilter {
  const value = searchParams.get("status");
  return value === "PENDING" || value === "ACCEPTED" || value === "REJECTED" ? value : "ALL";
}

export default function AdminApplicationsManagement() {
  const { isAuthReady, isAuthenticated, token, user } = useAuth();
  const {
    makeDecision,
    reviseDecision,
  } = useApplications();
  const searchParams = useSearchParams();

  // URL is the source of truth, including browser back/forward and notifications
  // received while this page is already mounted.
  const rawSearch = searchParams.get("search") ?? "";
  const legacyApplicationId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(rawSearch) ? rawSearch : "";
  const selectedApplicationId = searchParams.get("application") || legacyApplicationId;
  const searchTerm = selectedApplicationId ? "" : rawSearch;
  const statusFilter = getInitialStatusFilter(searchParams);
  const programId = searchParams.get("programId") || undefined;
  const pageValue = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const updateFilters = (values: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value); else params.delete(key);
    }
    const query = params.toString();
    window.history[replace ? "replaceState" : "pushState"](null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };
  const setPage = (value: number) => updateFilters({ page: value > 1 ? String(value) : null });
  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const applicationsQuery = useQuery({
    queryKey: ["applications", user?.id, { page, statusFilter, searchTerm, programId, selectedApplicationId }],
    queryFn: ({ signal }) => selectedApplicationId
      ? fetchApplicationDetail(selectedApplicationId, signal)
      : fetchApplicationList({ page, limit: DEFAULT_PAGE_SIZE, status: statusFilter, search: searchTerm, programId }, signal),
    enabled: isAuthReady && isAuthenticated && user?.role === "ADMIN",
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const applications = applicationsQuery.data?.data;
  const applicationsTotal = applicationsQuery.data?.total ?? null;
  const isApplicationsLoading = applicationsQuery.isPending;
  const applicationsError = applicationsQuery.error?.message;
  const refreshApplications = () => applicationsQuery.refetch();
  useEffect(() => {
    if (applicationsTotal !== null && page > 1 && !selectedApplicationId) {
      const lastPage = Math.max(1, Math.ceil(applicationsTotal / DEFAULT_PAGE_SIZE));
      if (page > lastPage) {
        const params = new URLSearchParams(window.location.search);
        params.set("page", String(lastPage));
        window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
      }
    }
  }, [applicationsTotal, page, selectedApplicationId]);
  const [statusDraftByApplicationId, setStatusDraftByApplicationId] = useState<
    Record<string, string>
  >({});
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [exportingApplicationId, setExportingApplicationId] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [applicationToRevise, setApplicationToRevise] = useState<Application | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [statusUpdateConfirmation, setStatusUpdateConfirmation] =
    useState<StatusUpdateConfirmation | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  // The report endpoint supports status/program, but not text search yet.
  const handleExportCsv = async () => {
    if (!token) {
      return;
    }

    resetActionFeedback();
    setIsExportingCsv(true);

    try {
      await downloadApplicationsCsv(token, { status: statusFilter, programId });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible d'exporter les candidatures.",
      );
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleReviseDecision = async (status: string, reason: string) => {
    if (!applicationToRevise) {
      return;
    }

    resetActionFeedback();
    setIsRevising(true);

    try {
      await reviseDecision(applicationToRevise.id, { status, reason });
      await refreshApplications();
      setApplicationToRevise(null);
      setActionMessage("Decision revisee et changement historise.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de reviser la decision.",
      );
    } finally {
      setIsRevising(false);
    }
  };

  const handleExportDecision = async (application: Application) => {
    if (!token) {
      return;
    }

    resetActionFeedback();
    setExportingApplicationId(application.id);

    try {
      await downloadDecisionReport(application.id, token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible de generer la fiche de decision.",
      );
    } finally {
      setExportingApplicationId(null);
    }
  };

  const sortedApplications = useMemo(
    () =>
      [...(applications ?? [])].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();

        return rightDate - leftDate;
      }),
    [applications],
  );

  const pageCount = getPageCount(applicationsTotal, DEFAULT_PAGE_SIZE);

  // Search and status are filtered before pagination by the API.
  const filteredApplications = sortedApplications;

  const applicationsByStatus = useMemo(() => {
    const groups: Record<ApplicationStatusColumn, Application[]> = {
      PENDING: [],
      ACCEPTED: [],
      REJECTED: [],
    };

    for (const application of filteredApplications) {
      const status = normalizeStatus(application.status);

      if (status === "PENDING" || status === "ACCEPTED" || status === "REJECTED") {
        groups[status].push(application);
      }
    }

    return groups;
  }, [filteredApplications]);

  const handleStatusDraftChange = (applicationId: string, status: string) => {
    setStatusDraftByApplicationId((current) => ({
      ...current,
      [applicationId]: status,
    }));
  };

  const handleStatusUpdate = (application: Application) => {
    resetActionFeedback();

    const currentStatus = normalizeStatus(application.status);
    const nextStatus = (statusDraftByApplicationId[application.id] || currentStatus).toUpperCase();

    if (nextStatus === currentStatus) {
      setActionError("Selectionnez un statut different avant d'enregistrer.");
      return;
    }

    if (!finalDecisionStatuses.includes(nextStatus as (typeof finalDecisionStatuses)[number])) {
      setActionError("Seules les decisions finales ACCEPTED ou REJECTED sont autorisees.");
      return;
    }

    if (application.decision) {
      setActionError("Une decision finale existe deja pour cette candidature.");
      return;
    }

    setStatusUpdateConfirmation({
      applicationId: application.id,
      currentStatus,
      nextStatus,
      programLabel: getProgramLabel(application),
      startupLabel: getStartupLabel(application),
      comment: "",
    });
  };

  const handleDecisionCommentChange = (value: string) => {
    setStatusUpdateConfirmation((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        comment: value,
      };
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
      await makeDecision(applicationId, {
        status: nextStatus,
        comment: statusUpdateConfirmation.comment.trim() || undefined,
      });
      await refreshApplications();
      setActionMessage("Decision finale enregistree avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible d'enregistrer la decision.");
    } finally {
      setUpdatingApplicationId(null);
      setStatusUpdateConfirmation(null);
    }
  };

  const submitDecisionForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void confirmStatusUpdate();
  };

  const isDecisionSubmitting = Boolean(
    statusUpdateConfirmation && updatingApplicationId === statusUpdateConfirmation.applicationId,
  );

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
              {isApplicationsLoading ? "Chargement…" : applicationsError ? "Liste indisponible" : selectedApplicationId
                ? "Candidature ouverte depuis une notification"
                : `${applicationsTotal === null ? "Total non communiqué par le serveur" : `${applicationsTotal} résultat(s)`} · ${filteredApplications.length} sur cette page`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label htmlFor="application-search" className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Rechercher une candidature
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              id="application-search"
              maxLength={200}
              onChange={(event) => updateFilters({ search: event.target.value, application: null, page: null }, true)}
              placeholder="Nom de startup ou programme…"
              type="text"
              value={searchTerm}
            />
          </div>
        </div>

        {selectedApplicationId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-orange-50 p-3 text-sm">
            <span>{applications?.[0] ? `${getStartupLabel(applications[0])} · ${getProgramLabel(applications[0])}` : "Dossier sélectionné"}</span>
            <button type="button" className="underline" onClick={() => updateFilters({ application: null, search: null, status: null, page: null })}>Voir toutes les candidatures</button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {statusFilterOptions.map((option) => {
              const isActive = !selectedApplicationId && statusFilter === option;

              return (
                <button
                  className={`dashboard-btn rounded-xl border px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? "border-brand/30 bg-brand text-brand-contrast"
                      : "border-border bg-white text-foreground hover:border-brand/35 hover:text-brand-strong"
                  }`}
                  key={option}
                  aria-pressed={!selectedApplicationId && isActive}
                  onClick={() => updateFilters({ status: option === "ALL" ? null : option, page: null, application: null, ...(legacyApplicationId ? { search: null } : {}) })}
                  type="button"
                >
                  {/* Le compte n'est connu que pour le filtre actif : le serveur ne
                      renvoie que les lignes correspondantes. */}
                  {option === "ALL" ? "Toutes" : applicationStatusLabel(option)}
                  {isActive && !selectedApplicationId && !isApplicationsLoading && !applicationsError && applicationsTotal !== null ? ` (${applicationsTotal})` : ""}
                </button>
              );
            })}
          </div>

          <div className="inline-flex rounded-xl border border-border bg-white p-1">
            {viewModeOptions.map((option) => {
              const isActive = viewMode === option;

              return (
                <button
                  className={`dashboard-btn rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? "bg-brand text-brand-contrast"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                  key={option}
                  onClick={() => setViewMode(option)}
                  type="button"
                >
                  {option === "TABLE" ? "Tableau" : "Kanban"}
                </button>
              );
            })}
          </div>

          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isExportingCsv || Boolean(searchTerm.trim()) || Boolean(selectedApplicationId)}
            title={searchTerm.trim() || selectedApplicationId ? "L’export serveur porte sur le statut, sans recherche ni sélection individuelle." : undefined}
            onClick={() => void handleExportCsv()}
            type="button"
          >
            {isExportingCsv ? "Export..." : "Exporter en CSV"}
          </button>
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
              <button className="ml-3 underline" type="button" onClick={() => void refreshApplications()}>Réessayer</button>
          </p>
        )}

        {!isApplicationsLoading && !applicationsError && viewMode === "TABLE" && (
          <ApplicationsTable
            applications={filteredApplications}
            exportingApplicationId={exportingApplicationId}
            hasSearchTerm={Boolean(searchTerm.trim())}
            onExportDecision={(application) => void handleExportDecision(application)}
            onReviseDecision={setApplicationToRevise}
            onStatusDraftChange={handleStatusDraftChange}
            onStatusUpdate={handleStatusUpdate}
            statusDraftByApplicationId={statusDraftByApplicationId}
            updatingApplicationId={updatingApplicationId}
          />
        )}

        {!isApplicationsLoading && !applicationsError && viewMode === "KANBAN" && (
          <ApplicationsKanban
            applicationsByStatus={applicationsByStatus}
            onStatusDraftChange={handleStatusDraftChange}
            onStatusUpdate={handleStatusUpdate}
            statusDraftByApplicationId={statusDraftByApplicationId}
            updatingApplicationId={updatingApplicationId}
          />
        )}

        {!applicationsError && !selectedApplicationId && (pageCount > 1 || applicationsTotal === null) && (
          <nav
            aria-label="Pagination des candidatures"
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-sm text-foreground-muted">
              Page {page}{applicationsTotal !== null ? ` sur ${pageCount}` : ""}
              {applicationsTotal !== null ? ` — ${applicationsTotal} candidatures` : ""}
            </p>

            <div className="flex items-center gap-2">
              <button
                className="dashboard-btn rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={page <= 1 || isApplicationsLoading}
                onClick={() => setPage(Math.max(1, page - 1))}
                type="button"
              >
                Precedent
              </button>
              <button
                className="dashboard-btn rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isApplicationsLoading || (applicationsTotal !== null ? page >= pageCount : filteredApplications.length < DEFAULT_PAGE_SIZE)}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Suivant
              </button>
            </div>
          </nav>
        )}

        <DecisionModal
          confirmation={statusUpdateConfirmation}
          isSubmitting={isDecisionSubmitting}
          onClose={cancelStatusUpdate}
          onCommentChange={handleDecisionCommentChange}
          onSubmit={submitDecisionForm}
        />

        <ReviseDecisionModal
          application={applicationToRevise}
          isSubmitting={isRevising}
          // key : remonte le formulaire a chaque candidature, sinon le motif saisi
          // pour l'une resterait affiche en ouvrant la suivante.
          key={applicationToRevise?.id ?? "none"}
          onCancel={() => {
            if (!isRevising) {
              setApplicationToRevise(null);
            }
          }}
          onConfirm={(status, reason) => void handleReviseDecision(status, reason)}
        />
      </section>
    </RoleGuard>
  );
}
