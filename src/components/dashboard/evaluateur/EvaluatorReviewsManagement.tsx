"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEvaluations } from "@/src/contexts/EvaluationContext";
import type { Evaluation, EvaluationRecommendation } from "@/src/types/evaluation";

type ReviewFormState = {
  innovationScore: string;
  marketScore: string;
  teamScore: string;
  feasibilityScore: string;
  fitScore: string;
  recommendation: string;
  strengths: string;
  weaknesses: string;
  comment: string;
};

const recommendationOptions: EvaluationRecommendation[] = [
  "FAVORABLE",
  "RESERVED",
  "UNFAVORABLE",
];

const emptyFormState: ReviewFormState = {
  innovationScore: "",
  marketScore: "",
  teamScore: "",
  feasibilityScore: "",
  fitScore: "",
  recommendation: "",
  strengths: "",
  weaknesses: "",
  comment: "",
};

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

function parseScore(input: string): number | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function mapEvaluationToForm(evaluation: Evaluation): ReviewFormState {
  return {
    innovationScore:
      evaluation.innovationScore === null || evaluation.innovationScore === undefined
        ? ""
        : String(evaluation.innovationScore),
    marketScore:
      evaluation.marketScore === null || evaluation.marketScore === undefined
        ? ""
        : String(evaluation.marketScore),
    teamScore:
      evaluation.teamScore === null || evaluation.teamScore === undefined
        ? ""
        : String(evaluation.teamScore),
    feasibilityScore:
      evaluation.feasibilityScore === null || evaluation.feasibilityScore === undefined
        ? ""
        : String(evaluation.feasibilityScore),
    fitScore:
      evaluation.fitScore === null || evaluation.fitScore === undefined
        ? ""
        : String(evaluation.fitScore),
    recommendation: evaluation.recommendation || "",
    strengths: evaluation.strengths || "",
    weaknesses: evaluation.weaknesses || "",
    comment: evaluation.comment || "",
  };
}

function getProgramLabelFromEvaluation(evaluation: Evaluation): string {
  return evaluation.application?.program?.title || evaluation.application?.programId || "-";
}

function getStartupLabelFromEvaluation(evaluation: Evaluation): string {
  return evaluation.application?.startup?.startupName || evaluation.application?.startupId || "-";
}

export default function EvaluatorReviewsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    myEvaluations,
    isEvaluationsLoading,
    evaluationsError,
    clearEvaluationsError,
    fetchMyEvaluations,
    updateMyEvaluation,
    submitMyEvaluation,
  } = useEvaluations();

  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewFormState>(emptyFormState);
  const [savingEvaluationId, setSavingEvaluationId] = useState<string | null>(null);
  const [submittingEvaluationId, setSubmittingEvaluationId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    clearEvaluationsError();
    void fetchMyEvaluations().catch(() => {
    });
  }, [isAuthReady, isAuthenticated, clearEvaluationsError, fetchMyEvaluations]);

  const sortedEvaluations = useMemo(
    () =>
      [...myEvaluations].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();
        return rightDate - leftDate;
      }),
    [myEvaluations],
  );

  const displayEvaluations = useMemo(() => {
    const map = new Map<string, Evaluation>();

    for (const evaluation of sortedEvaluations) {
      const applicationId = evaluation.applicationId || evaluation.application?.id;
      const key = applicationId || evaluation.id;

      if (!key) {
        continue;
      }

      if (!map.has(key)) {
        map.set(key, evaluation);
      }
    }

    return [...map.values()];
  }, [sortedEvaluations]);

  useEffect(() => {
    if (displayEvaluations.length === 0) {
      setSelectedEvaluationId(null);
      return;
    }

    const alreadyExists = displayEvaluations.some(
      (evaluation) => evaluation.id === selectedEvaluationId,
    );

    if (!selectedEvaluationId || !alreadyExists) {
      setSelectedEvaluationId(displayEvaluations[0].id);
    }
  }, [displayEvaluations, selectedEvaluationId]);

  const selectedEvaluation = useMemo(
    () => displayEvaluations.find((evaluation) => evaluation.id === selectedEvaluationId) || null,
    [displayEvaluations, selectedEvaluationId],
  );

  const groupedEvaluations = useMemo(() => {
    const groups = new Map<
      string,
      {
        groupKey: string;
        programLabel: string;
        items: Evaluation[];
      }
    >();

    for (const evaluation of displayEvaluations) {
      const programId = evaluation.application?.program?.id || evaluation.application?.programId || "unknown";
      const programLabel = getProgramLabelFromEvaluation(evaluation);
      const groupKey = `${programId}:${programLabel}`;
      const currentGroup = groups.get(groupKey);

      if (!currentGroup) {
        groups.set(groupKey, {
          groupKey,
          programLabel,
          items: [evaluation],
        });
        continue;
      }

      currentGroup.items.push(evaluation);
    }

    return [...groups.values()].sort((left, right) => left.programLabel.localeCompare(right.programLabel));
  }, [displayEvaluations]);

  useEffect(() => {
    if (!selectedEvaluation) {
      setForm(emptyFormState);
      return;
    }

    setForm(mapEvaluationToForm(selectedEvaluation));
  }, [selectedEvaluation]);

  const stats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let submitted = 0;

    for (const evaluation of displayEvaluations) {
      const status = normalizeStatus(evaluation.status);

      if (status === "SUBMITTED") {
        submitted += 1;
      } else if (status === "IN_PROGRESS") {
        inProgress += 1;
      } else {
        pending += 1;
      }
    }

    return {
      total: displayEvaluations.length,
      pending,
      inProgress,
      submitted,
    };
  }, [displayEvaluations]);

  const resetFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const handleSaveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedEvaluation) {
      return;
    }

    resetFeedback();

    const payload = {
      innovationScore: parseScore(form.innovationScore),
      marketScore: parseScore(form.marketScore),
      teamScore: parseScore(form.teamScore),
      feasibilityScore: parseScore(form.feasibilityScore),
      fitScore: parseScore(form.fitScore),
      recommendation: form.recommendation
        ? (form.recommendation as EvaluationRecommendation)
        : undefined,
      strengths: form.strengths.trim() || undefined,
      weaknesses: form.weaknesses.trim() || undefined,
      comment: form.comment.trim() || undefined,
    };

    const payloadHasValue = Object.values(payload).some((value) => value !== undefined);

    if (!payloadHasValue) {
      setActionError("Ajoute au moins un champ avant de sauvegarder le brouillon.");
      return;
    }

    setSavingEvaluationId(selectedEvaluation.id);

    try {
      await updateMyEvaluation(selectedEvaluation.id, payload);
      setActionMessage("Brouillon enregistre avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de la sauvegarde du brouillon.");
    } finally {
      setSavingEvaluationId(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvaluation) {
      return;
    }

    resetFeedback();

    const innovationScore = parseScore(form.innovationScore);
    const marketScore = parseScore(form.marketScore);
    const teamScore = parseScore(form.teamScore);
    const feasibilityScore = parseScore(form.feasibilityScore);
    const fitScore = parseScore(form.fitScore);
    const recommendation = form.recommendation as EvaluationRecommendation;
    const strengths = form.strengths.trim();
    const weaknesses = form.weaknesses.trim();
    const comment = form.comment.trim();

    if (
      innovationScore === undefined ||
      marketScore === undefined ||
      teamScore === undefined ||
      feasibilityScore === undefined ||
      fitScore === undefined ||
      !recommendation ||
      !strengths ||
      !weaknesses ||
      !comment
    ) {
      setActionError("Complete tous les champs avant la soumission finale.");
      return;
    }

    setSubmittingEvaluationId(selectedEvaluation.id);

    try {
      await submitMyEvaluation(selectedEvaluation.id, {
        innovationScore,
        marketScore,
        teamScore,
        feasibilityScore,
        fitScore,
        recommendation,
        strengths,
        weaknesses,
        comment,
      });
      setActionMessage("Evaluation soumise avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de la soumission.");
    } finally {
      setSubmittingEvaluationId(null);
    }
  };

  return (
    <RoleGuard allowedRole="EVALUATOR">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">Evaluation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Mes reviews
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Gere tes evaluations et soumets tes recommandations.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Total</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</p>
          </article>
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Pending</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.pending}</p>
          </article>
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.inProgress}</p>
          </article>
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Submitted</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stats.submitted}</p>
          </article>
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

        {evaluationsError && !actionError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {evaluationsError}
          </p>
        )}

        <div className="mt-6 grid gap-4 xl:grid-cols-[340px_1fr]">
          <article className="dashboard-soft-block p-4">
            <h2 className="text-base font-semibold text-foreground">Evaluations assignees</h2>
            <p className="mt-1 text-sm text-foreground-muted">Selectionne une evaluation pour editer.</p>

            {isEvaluationsLoading && displayEvaluations.length === 0 && (
              <div className="mt-4 space-y-2">
                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              </div>
            )}

            {!isEvaluationsLoading && displayEvaluations.length === 0 && (
              <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
                Aucune evaluation assignee.
              </p>
            )}

            {groupedEvaluations.length > 0 && (
              <div className="mt-4 space-y-3">
                {groupedEvaluations.map((group) => (
                  <article className="rounded-xl border border-border/70 bg-white p-2.5" key={group.groupKey}>
                    <div className="flex items-center justify-between gap-2 px-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-muted">
                        Programme
                      </p>
                      <span className="inline-flex rounded-full border border-border bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
                        {group.items.length}
                      </span>
                    </div>

                    <h3 className="px-1 pt-1 text-sm font-semibold text-foreground">{group.programLabel}</h3>

                    <div className="mt-2 space-y-2">
                      {group.items.map((evaluation) => {
                        const status = normalizeStatus(evaluation.status);
                        const startupLabel = getStartupLabelFromEvaluation(evaluation);

                        return (
                          <button
                            className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                              selectedEvaluationId === evaluation.id
                                ? "border-brand/35 bg-brand/10"
                                : "border-border/70 bg-white hover:border-brand/30"
                            }`}
                            key={evaluation.id}
                            onClick={() => setSelectedEvaluationId(evaluation.id)}
                            type="button"
                          >
                            <p className="text-sm font-semibold text-foreground">Startup: {startupLabel}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClass(status)}`}
                              >
                                {status}
                              </span>
                              <span className="text-[11px] text-foreground-muted">
                                Score: {evaluation.overallScore ?? "-"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-soft-block p-4">
            <h2 className="text-base font-semibold text-foreground">Formulaire de review</h2>

            {!selectedEvaluation && (
              <p className="mt-3 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
                Selectionne une evaluation pour commencer.
              </p>
            )}

            {selectedEvaluation && (
              <form className="mt-3 space-y-4" onSubmit={handleSaveDraft}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="text-xs text-foreground-muted">
                    Innovation
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, innovationScore: event.target.value }))
                      }
                      step="0.1"
                      type="number"
                      value={form.innovationScore}
                    />
                  </label>

                  <label className="text-xs text-foreground-muted">
                    Marche
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, marketScore: event.target.value }))
                      }
                      step="0.1"
                      type="number"
                      value={form.marketScore}
                    />
                  </label>

                  <label className="text-xs text-foreground-muted">
                    Equipe
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, teamScore: event.target.value }))
                      }
                      step="0.1"
                      type="number"
                      value={form.teamScore}
                    />
                  </label>

                  <label className="text-xs text-foreground-muted">
                    Faisabilite
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, feasibilityScore: event.target.value }))
                      }
                      step="0.1"
                      type="number"
                      value={form.feasibilityScore}
                    />
                  </label>

                  <label className="text-xs text-foreground-muted">
                    Fit
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      max="10"
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, fitScore: event.target.value }))
                      }
                      step="0.1"
                      type="number"
                      value={form.fitScore}
                    />
                  </label>
                </div>

                <label className="block text-xs text-foreground-muted">
                  Recommendation
                  <select
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, recommendation: event.target.value }))
                    }
                    value={form.recommendation}
                  >
                    <option value="">Choisir une recommendation</option>
                    {recommendationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-foreground-muted">
                  Points forts
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, strengths: event.target.value }))
                    }
                    rows={3}
                    value={form.strengths}
                  />
                </label>

                <label className="block text-xs text-foreground-muted">
                  Points faibles
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, weaknesses: event.target.value }))
                    }
                    rows={3}
                    value={form.weaknesses}
                  />
                </label>

                <label className="block text-xs text-foreground-muted">
                  Commentaire
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, comment: event.target.value }))
                    }
                    rows={4}
                    value={form.comment}
                  />
                </label>

                <div className="grid gap-2 text-xs text-foreground-muted sm:grid-cols-3">
                  <p className="rounded-lg border border-border/70 bg-white px-3 py-2">
                    Statut: {normalizeStatus(selectedEvaluation.status)}
                  </p>
                  <p className="rounded-lg border border-border/70 bg-white px-3 py-2">
                    Score global: {selectedEvaluation.overallScore ?? "-"}
                  </p>
                  <p className="rounded-lg border border-border/70 bg-white px-3 py-2">
                    Soumis le: {formatDate(selectedEvaluation.submittedAt)}
                  </p>
                </div>

                {normalizeStatus(selectedEvaluation.status) === "SUBMITTED" && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Cette evaluation est deja soumise et ne peut plus etre modifiee.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={
                      Boolean(savingEvaluationId) ||
                      Boolean(submittingEvaluationId) ||
                      normalizeStatus(selectedEvaluation.status) === "SUBMITTED"
                    }
                    type="submit"
                  >
                    {savingEvaluationId === selectedEvaluation.id ? "Enregistrement..." : "Sauvegarder brouillon"}
                  </button>

                  <button
                    className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={
                      Boolean(savingEvaluationId) ||
                      Boolean(submittingEvaluationId) ||
                      normalizeStatus(selectedEvaluation.status) === "SUBMITTED"
                    }
                    onClick={() => {
                      void handleSubmit();
                    }}
                    type="button"
                  >
                    {submittingEvaluationId === selectedEvaluation.id ? "Soumission..." : "Soumettre review"}
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>
      </section>
    </RoleGuard>
  );
}
