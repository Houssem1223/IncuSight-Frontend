"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  useApplicationAiAnalysis,
  useGenerateApplicationAiAnalysis,
} from "@/src/hooks/useApplicationAiAnalysis";
import {
  ADVISORY_BADGE_LABEL,
  ADVISORY_INTRO,
  ADVISORY_NOTICE,
  NOT_GENERATED_MESSAGE,
  NO_SUBMITTED_EVALUATIONS_MESSAGE,
  canGenerateAnalysis,
  formatGeneratedAt,
  formatMean,
  formatScoreRange,
  getAiAnalysisErrorMessage,
  getBusyMessage,
  getCriterionLabel,
  getDetailedDivergences,
  getDivergenceNotice,
  getPrimaryActionLabel,
  getSeverityLabel,
  getSeverityTone,
  getSummarySections,
  isReadyAnalysis,
  type SeverityTone,
} from "@/src/lib/ai-analysis-view";
import type {
  CriterionDivergence,
  DivergenceSeverity,
  ReadyAiAnalysis,
} from "@/src/types/ai-analysis";

type ApplicationAiAnalysisCardProps = {
  applicationId: string;
  /**
   * Nombre d'évaluations soumises, tel que connu par l'écran.
   * `null` si l'information n'est pas encore chargée : on ne désactive alors
   * rien, c'est le backend qui refusera si besoin.
   */
  submittedEvaluations: number | null;
};

// Mêmes teintes que les sévérités d'`InsightsCard` : le dashboard utilise déjà
// ce trio ambre/rouge/émeraude, il n'y a pas de variante de badge à réutiliser.
const TONE_CLASSES: Record<SeverityTone, string> = {
  neutral: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

/** Le libellé porte l'information : la couleur n'est qu'un renfort. */
function SeverityBadge({ severity }: { severity: DivergenceSeverity }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[getSeverityTone(severity)]}`}
    >
      {getSeverityLabel(severity)}
    </span>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <div className="h-20 animate-pulse rounded-xl bg-background-accent" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-background-accent" />
        <div className="h-28 animate-pulse rounded-xl bg-background-accent" />
      </div>
    </div>
  );
}

function DivergenceDetail({ divergence }: { divergence: CriterionDivergence }) {
  return (
    <article className="rounded-xl border border-border/75 bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">
          {getCriterionLabel(divergence.criterion)}
        </h4>
        <SeverityBadge severity={divergence.severity} />
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground-muted">
        <div className="flex gap-1">
          <dt>Moyenne :</dt>
          <dd className="font-medium text-foreground">{formatMean(divergence.mean)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Min :</dt>
          <dd className="font-medium text-foreground">{divergence.min}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Max :</dt>
          <dd className="font-medium text-foreground">{divergence.max}</dd>
        </div>
      </dl>

      {divergence.explanation && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
            Explication IA
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {divergence.explanation}
          </p>
        </div>
      )}

      {divergence.keyDifferences.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
            Différences principales
          </p>
          <ul className="mt-1.5 space-y-1 text-sm leading-6 text-foreground">
            {divergence.keyDifferences.map((difference) => (
              <li className="flex gap-2" key={difference}>
                <span aria-hidden="true" className="text-foreground-muted">
                  &ndash;
                </span>
                <span>{difference}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* L'écart-type brut n'aide pas un lecteur métier : il reste disponible,
          replié, pour qui veut vérifier le calcul du backend. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-foreground-muted hover:text-brand-strong">
          Détail technique
        </summary>
        <p className="mt-1.5 text-xs text-foreground-muted">
          Écart-type {divergence.standardDeviation.toFixed(2)} &middot; divergence normalisée{" "}
          {divergence.normalizedDivergence.toFixed(2)} &middot; amplitude {divergence.range}
        </p>
      </details>
    </article>
  );
}

function AnalysisBody({ analysis }: { analysis: ReadyAiAnalysis }) {
  const divergenceNotice = getDivergenceNotice(analysis);
  const detailedDivergences = getDetailedDivergences(analysis.divergences);

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="ai-analysis-summary">
        <h3
          className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted"
          id="ai-analysis-summary"
        >
          Synthèse
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {analysis.summary.executiveSummary}
        </p>
      </section>

      {/* Deux colonnes sur desktop (forces / faiblesses), une seule sur mobile. */}
      <div className="grid gap-6 md:grid-cols-2">
        {getSummarySections(analysis.summary).map((section) => (
          <section
            className={section.key === "clarify" ? "md:col-span-2" : undefined}
            key={section.key}
          >
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              {section.title}
            </h3>
            {section.items.length === 0 ? (
              <p className="mt-2 text-sm italic text-foreground-muted">
                {section.emptyMessage}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-foreground">
                {section.items.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span aria-hidden="true" className="text-foreground-muted">
                      {section.marker}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="ai-analysis-consensus">
        <h3
          className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted"
          id="ai-analysis-consensus"
        >
          Consensus des évaluateurs
        </h3>

        {divergenceNotice && (
          <p className="mt-2 rounded-xl border border-border/75 bg-background-accent px-3 py-2 text-sm text-foreground-muted">
            {divergenceNotice}
          </p>
        )}

        {analysis.divergences.length > 0 && (
          <ul className="mt-3 space-y-2">
            {analysis.divergences.map((divergence) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/75 bg-surface px-3 py-2.5"
                key={divergence.criterion}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {getCriterionLabel(divergence.criterion)}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Moyenne {formatMean(divergence.mean)} &middot;{" "}
                    {formatScoreRange(divergence)}
                  </p>
                </div>
                <SeverityBadge severity={divergence.severity} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {detailedDivergences.length > 0 && (
        <section aria-labelledby="ai-analysis-divergences">
          <h3
            className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted"
            id="ai-analysis-divergences"
          >
            Divergences à examiner
          </h3>
          <div className="mt-3 grid gap-3">
            {detailedDivergences.map((divergence) => (
              <DivergenceDetail divergence={divergence} key={divergence.criterion} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Aide à la lecture des évaluations d'une candidature, réservée à l'espace ADMIN.
 *
 * Le composant n'expose volontairement aucune action de décision : il ne pré-remplit
 * ni ne déclenche le formulaire d'acceptation/rejet, qui vit sur un autre écran
 * (`/dashboard/admin/applications`). Il ne calcule rien non plus — toutes les
 * statistiques affichées sont celles renvoyées par le backend.
 */
export default function ApplicationAiAnalysisCard({
  applicationId,
  submittedEvaluations,
}: ApplicationAiAnalysisCardProps) {
  const analysisQuery = useApplicationAiAnalysis(applicationId);
  const generateMutation = useGenerateApplicationAiAnalysis(applicationId);

  const analysis = analysisQuery.data;
  const readyAnalysis = isReadyAnalysis(analysis) ? analysis : null;
  const isGenerating = generateMutation.isPending;
  const primaryActionLabel = getPrimaryActionLabel(analysis);
  const canGenerate = canGenerateAnalysis(submittedEvaluations);
  const busyMessage = getBusyMessage({
    isLoading: analysisQuery.isPending || analysisQuery.isFetching,
    isGenerating,
  });

  // L'erreur de la dernière action prime sur celle du chargement : c'est celle
  // que l'admin vient de provoquer.
  const activeError =
    generateMutation.error ?? analysisQuery.error ?? null;
  const errorMessage = activeError ? getAiAnalysisErrorMessage(activeError) : null;

  const runGeneration = () => {
    generateMutation.mutate();
  };

  return (
    <section
      aria-busy={isGenerating || analysisQuery.isFetching}
      aria-labelledby="ai-analysis-title"
      className="motion-rise dashboard-surface mt-6 p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              className="text-xl font-semibold tracking-tight text-foreground md:text-2xl"
              id="ai-analysis-title"
            >
              Analyse intelligente des évaluations
            </h2>
            <Badge>
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              {ADVISORY_BADGE_LABEL}
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">{ADVISORY_INTRO}</p>
          {readyAnalysis && (
            <p className="mt-1 text-xs text-foreground-muted">
              Analyse générée le {formatGeneratedAt(readyAnalysis.meta.generatedAt)} &middot;{" "}
              {readyAnalysis.meta.submittedEvaluations} évaluation
              {readyAnalysis.meta.submittedEvaluations > 1 ? "s" : ""} soumise
              {readyAnalysis.meta.submittedEvaluations > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {primaryActionLabel && <Button
          aria-describedby={!canGenerate ? "ai-analysis-unavailable" : undefined}
          disabled={
            isGenerating || analysisQuery.isPending || analysisQuery.isFetching ||
            analysisQuery.isError || !canGenerate
          }
          onClick={runGeneration}
          size="sm"
          type="button"
          variant="default"
        >
          {isGenerating ? "Analyse en cours…" : primaryActionLabel}
        </Button>}
      </div>

      {!canGenerate && (
        <p
          className="mt-4 rounded-xl border border-border/75 bg-background-accent px-3 py-2 text-sm text-foreground-muted"
          id="ai-analysis-unavailable"
        >
          {NO_SUBMITTED_EVALUATIONS_MESSAGE}
        </p>
      )}

      {busyMessage && (
        <p
          aria-live="polite"
          className="mt-4 text-sm text-foreground-muted"
          role="status"
        >
          {busyMessage}
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {analysisQuery.isError && (
        <Button
          className="mt-3"
          disabled={analysisQuery.isFetching || isGenerating}
          onClick={() => void analysisQuery.refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          Réessayer le chargement
        </Button>
      )}

      {/* Pendant une actualisation, l'analyse précédente reste affichée : la
          masquer ferait clignoter tout le bloc pour rien. */}
      {analysisQuery.isPending && canGenerate && <AnalysisSkeleton />}

      {readyAnalysis && <AnalysisBody analysis={readyAnalysis} />}

      {analysis && !readyAnalysis && analysisQuery.isSuccess && canGenerate && !isGenerating && (
        <p className="mt-4 rounded-xl border border-border/75 bg-background-accent px-3 py-3 text-sm text-foreground-muted">
          {analysis?.status === "STALE"
            ? "Les évaluations ont changé depuis la dernière analyse : actualisez-la pour qu’elle porte sur les avis actuels."
            : NOT_GENERATED_MESSAGE}
        </p>
      )}

      <p className="mt-6 border-t border-border/60 pt-4 text-xs text-foreground-muted">
        {ADVISORY_NOTICE}
      </p>

    </section>
  );
}
