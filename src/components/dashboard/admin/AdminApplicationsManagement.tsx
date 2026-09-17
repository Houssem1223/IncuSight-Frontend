"use client";

import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { downloadApplicationsCsv, downloadDecisionReport } from "@/src/lib/reports";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
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

function getInitialSearchTerm(searchParams: URLSearchParams): string {
  return searchParams.get("search") ?? "";
}

export default function AdminApplicationsManagement() {
  const { isAuthReady, isAuthenticated, token } = useAuth();
  const {
    applications,
    isApplicationsLoading,
    applicationsError,
    applicationsTotal,
    clearApplicationsError,
    fetchAllApplications,
    makeDecision,
    reviseDecision,
  } = useApplications();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(() => getInitialSearchTerm(searchParams));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    getInitialStatusFilter(searchParams),
  );
  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");
  const [page, setPage] = useState(1);
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

  // L'export reprend le filtre de statut affiche : ce qui est exporte correspond
  // a ce que l'utilisateur a sous les yeux. La recherche texte reste cote client,
  // le backend ne l'expose pas comme filtre.
  const handleExportCsv = async () => {
    if (!token) {
      return;
    }

    resetActionFeedback();
    setIsExportingCsv(true);

    try {
      await downloadApplicationsCsv(token, { status: statusFilter });
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

  // Statut et pagination partent au serveur ensemble : filtrer apres coup une page
  // deja decoupee ne montrerait que les correspondances de cette page.
  const refreshApplications = useCallback(async () => {
    clearApplicationsError();

    try {
      await fetchAllApplications({
        page,
        limit: DEFAULT_PAGE_SIZE,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
    } catch {
    }
  }, [clearApplicationsError, fetchAllApplications, page, statusFilter]);

  useAutoRefresh(refreshApplications, {
    enabled: isAuthReady && isAuthenticated,
    intervalMs: 60000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
  });

  const sortedApplications = useMemo(
    () =>
      [...applications].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();

        return rightDate - leftDate;
      }),
    [applications],
  );

  const pageCount = getPageCount(applicationsTotal, DEFAULT_PAGE_SIZE);

  // Le statut est filtre par le serveur. La recherche texte, elle, n'a pas
  // d'equivalent backend : elle reste locale et ne porte donc que sur la page
  // affichee — c'est dit explicitement dans le libelle du champ.
  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedApplications;
    }

    return sortedApplications.filter((application) => {
      const program = getProgramLabel(application).toLowerCase();
      const startup = getStartupLabel(application).toLowerCase();
      const status = normalizeStatus(application.status).toLowerCase();
      const motivation = (application.motivationLetter || "").toLowerCase();

      return (
        program.includes(query) ||
        startup.includes(query) ||
        status.includes(query) ||
        motivation.includes(query) ||
        application.id.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, sortedApplications]);

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
              {searchTerm.trim() || statusFilter !== "ALL"
                ? `${filteredApplications.length} sur ${applications.length} candidatures affichees`
                : `Total de candidatures: ${applicationsTotal ?? applications.length}`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Recherche dans cette page
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Programme, startup, statut, motivation..."
              type="text"
              value={searchTerm}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
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
                  onClick={() => {
                    setStatusFilter(option);
                    // Le filtre part au serveur : rester sur la page 5 d'un autre
                    // filtre afficherait une page vide.
                    setPage(1);
                  }}
                  type="button"
                >
                  {/* Le compte n'est connu que pour le filtre actif : le serveur ne
                      renvoie que les lignes correspondantes. */}
                  {option}
                  {isActive && applicationsTotal !== null ? ` (${applicationsTotal})` : ""}
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
            disabled={isExportingCsv}
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

        {pageCount > 1 && (
          <nav
            aria-label="Pagination des candidatures"
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-sm text-foreground-muted">
              Page {page} sur {pageCount}
              {applicationsTotal !== null ? ` — ${applicationsTotal} candidatures` : ""}
            </p>

            <div className="flex items-center gap-2">
              <button
                className="dashboard-btn rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={page <= 1 || isApplicationsLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Precedent
              </button>
              <button
                className="dashboard-btn rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={page >= pageCount || isApplicationsLoading}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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
