"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import ApplicationAiAnalysisCard from "@/src/components/dashboard/admin/evaluations/ApplicationAiAnalysisCard";
import { Button } from "@/src/components/ui/button";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEvaluations } from "@/src/contexts/EvaluationContext";
import type { Application } from "@/src/types/application";
import { downloadEvaluationReport } from "@/src/lib/reports";
import { invalidateApplicationAiAnalysis } from "@/src/lib/ai-analysis-query";
import type { Evaluation } from "@/src/types/evaluation";

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

function getEvaluatorLabel(evaluation: Evaluation): string {
  return evaluation.evaluator?.email || evaluation.evaluatorId || "Evaluateur inconnu";
}

// Une evaluation non soumise n'a pas encore de contenu redige exploitable : on ne
// montre que les evaluations SUBMITTED pour ne pas laisser croire a un avis rendu.
function hasWrittenAnalysis(evaluation: Evaluation): boolean {
  if (normalizeStatus(evaluation.status) !== "SUBMITTED") {
    return false;
  }

  return Boolean(
    evaluation.strengths?.trim() || evaluation.weaknesses?.trim() || evaluation.comment?.trim(),
  );
}

function AnalysisField({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim();

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
        {label}
      </p>
      {text ? (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{text}</p>
      ) : (
        <p className="mt-1.5 text-sm italic text-foreground-muted">Non renseigne.</p>
      )}
    </div>
  );
}

export default function AdminApplicationEvaluationsManagement() {
  const queryClient = useQueryClient();
  const { isAuthReady, isAuthenticated, token } = useAuth();
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
    reopenEvaluation,
  } = useEvaluations();

  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [pendingReopenEvaluation, setPendingReopenEvaluation] = useState<Evaluation | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [isReopening, setIsReopening] = useState(false);
  const [reopenError, setReopenError] = useState("");

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

  const handleExport = async (applicationId: string) => {
    if (!token) {
      return;
    }

    setExportError("");
    setIsExporting(true);

    try {
      await downloadEvaluationReport(applicationId, token);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Impossible de generer le PDF.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const cancelReopen = () => {
    if (isReopening) {
      return;
    }

    setPendingReopenEvaluation(null);
    setReopenError("");
  };

  const confirmReopen = async () => {
    if (!pendingReopenEvaluation || !activeApplicationId) {
      return;
    }

    setReopenError("");
    setIsReopening(true);

    try {
      await reopenEvaluation(pendingReopenEvaluation.id);
      await invalidateApplicationAiAnalysis(queryClient, activeApplicationId);
      await Promise.all([
        fetchEvaluationsByApplication(activeApplicationId),
        fetchApplicationSummary(activeApplicationId),
      ]);
      setPendingReopenEvaluation(null);
    } catch (error) {
      setReopenError(error instanceof Error ? error.message : "Impossible de rouvrir l'évaluation.");
    } finally {
      setIsReopening(false);
    }
  };

  const applicationEvaluations =
    evaluationsByApplicationId[activeApplicationId] ||
    summariesByApplicationId[activeApplicationId]?.evaluations ||
    [];
  const summary = summariesByApplicationId[activeApplicationId];
  // Le backend fait foi sur le nombre d'avis soumis. Tant que la synthese n'est
  // pas chargee, on ne prejuge pas (null) plutot que d'annoncer a tort qu'aucune
  // evaluation n'a ete soumise et de desactiver l'analyse IA.
  const submittedEvaluationsCount = summary ? summary.submittedCount : null;
  const writtenAnalyses = applicationEvaluations.filter(hasWrittenAnalysis);
  const submittedCount = applicationEvaluations.filter(
    (evaluation) => normalizeStatus(evaluation.status) === "SUBMITTED",
  ).length;

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
                    <th className="px-4 py-3 font-medium">Action</th>
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
                        <td className="px-4 py-3">
                          {status === "SUBMITTED" && (
                            <Button
                              onClick={() => setPendingReopenEvaluation(evaluation)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Rouvrir
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isEvaluationsLoading && activeApplicationId && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              disabled={isExporting}
              onClick={() => void handleExport(activeApplicationId)}
              size="sm"
              type="button"
              variant="outline"
            >
              {isExporting ? "Generation..." : "Exporter la grille (PDF)"}
            </Button>
            {exportError && <span className="text-sm text-red-700">{exportError}</span>}
          </div>
        )}

        {!isEvaluationsLoading && activeApplicationId && submittedCount > 0 && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <h3 className="text-base font-semibold text-foreground">Analyses des evaluateurs</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Le detail redige par chaque evaluateur, sur lequel s&apos;appuie la decision.
            </p>

            {writtenAnalyses.length === 0 ? (
              <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
                Les evaluations soumises ne contiennent aucun commentaire redige.
              </p>
            ) : (
              <div className="mt-4 grid gap-4">
                {writtenAnalyses.map((evaluation) => (
                  <article
                    className="rounded-xl border border-border/75 bg-white/85 p-4 shadow-sm"
                    key={evaluation.id}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {getEvaluatorLabel(evaluation)}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Score global {evaluation.overallScore ?? "-"} / 5
                        {evaluation.recommendation ? ` - ${evaluation.recommendation}` : ""}
                        {` - soumis le ${formatDate(evaluation.submittedAt)}`}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <AnalysisField label="Points forts" value={evaluation.strengths} />
                      <AnalysisField label="Points faibles" value={evaluation.weaknesses} />
                    </div>

                    <div className="mt-4">
                      <AnalysisField label="Commentaire" value={evaluation.comment} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {reopenError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {reopenError}
          </p>
        )}
      </section>

      {activeApplicationId && (
        <ApplicationAiAnalysisCard
          applicationId={activeApplicationId}
          key={activeApplicationId}
          submittedEvaluations={submittedEvaluationsCount}
        />
      )}

      <ConfirmDialog
        confirmLabel="Rouvrir"
        description={`L'evaluation de ${pendingReopenEvaluation?.evaluator?.email || pendingReopenEvaluation?.evaluatorId || "cet evaluateur"} sera repassee en cours et devra etre resoumise. Cette action annule sa soumission actuelle.`}
        isConfirming={isReopening}
        isOpen={pendingReopenEvaluation !== null}
        onCancel={cancelReopen}
        onConfirm={() => void confirmReopen()}
        title="Rouvrir cette evaluation ?"
        tone="danger"
      />
    </RoleGuard>
  );
}
