"use client";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  AI_GENERATION_IN_PROGRESS,
  VIGILANCE_AI_ADVISORY_BADGE,
  VIGILANCE_AI_INTRO,
  formatVigilanceDate,
  getVigilanceAiState,
  type EvidenceContext,
} from "@/src/lib/startup-vigilance-view";
import type { StartupVigilanceDetail } from "@/src/types/startup-vigilance";
import AttentionPointsCard from "./AttentionPointsCard";
import PositiveSignalsCard from "./PositiveSignalsCard";
import SuggestedActionsCard from "./SuggestedActionsCard";
import VigilanceIssues from "./VigilanceIssues";

type VigilanceAiAnalysisProps = {
  detail: StartupVigilanceDetail;
  context: EvidenceContext;
  isGenerating: boolean;
  onGenerate: () => void;
};

function SectionTitle({ children, id }: { children: string; id?: string }) {
  return (
    <h4
      className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted"
      id={id}
    >
      {children}
    </h4>
  );
}

/**
 * Analyse qualitative du suivi — volontairement séparée du score déterministe.
 *
 * Le score répond à « qui nécessite de l'attention ». Cette section répond à
 * « pourquoi et sur quels sujets » : elle n'affiche aucun chiffre de scoring et
 * ne réécrit aucun texte renvoyé par le backend.
 *
 * Pendant une génération, l'analyse précédente reste affichée : seule l'action
 * est désactivée, et le score au-dessus n'est jamais masqué.
 */
export default function VigilanceAiAnalysis({
  context,
  detail,
  isGenerating,
  onGenerate,
}: VigilanceAiAnalysisProps) {
  const state = getVigilanceAiState(detail);
  const analysis = detail.aiAnalysis;
  const showAnalysis = state.showAnalysis && analysis !== null;

  return (
    <section
      aria-busy={isGenerating}
      aria-labelledby="vigilance-ai-title"
      className="inc-ai-analysis"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3
              className="text-lg font-semibold tracking-tight text-foreground"
              id="vigilance-ai-title"
            >
              Analyse intelligente du suivi
            </h3>
            <Badge>
              {VIGILANCE_AI_ADVISORY_BADGE}
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
            {VIGILANCE_AI_INTRO}
          </p>
          {showAnalysis && detail.ai.generatedAt && (
            <p className="mt-1 text-xs text-foreground-muted">
              Analyse générée le {formatVigilanceDate(detail.ai.generatedAt)}
            </p>
          )}
        </div>

        {state.actionLabel && (
          <Button
            disabled={isGenerating}
            onClick={onGenerate}
            size="sm"
            type="button"
            variant={showAnalysis ? "outline" : "default"}
          >
            {isGenerating ? AI_GENERATION_IN_PROGRESS : state.actionLabel}
          </Button>
        )}
      </div>

      {isGenerating && (
        <p
          aria-live="polite"
          className="mt-4 text-sm text-foreground-muted"
          role="status"
        >
          {AI_GENERATION_IN_PROGRESS}
        </p>
      )}

      {/* L'indisponibilité du modèle est une information, pas une erreur bloquante :
          le backend a répondu 200 et le score reste affiché au-dessus. */}
      {state.notice && !isGenerating && (
        <p
          className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
            state.degraded
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-border/75 bg-surface text-foreground-muted"
          }`}
          role={state.degraded ? "status" : undefined}
        >
          {state.notice}
        </p>
      )}

      {showAnalysis && analysis && (
        <div className="mt-6 space-y-6">
          <section aria-labelledby="vigilance-ai-summary">
            <SectionTitle id="vigilance-ai-summary">Synthèse</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
              {analysis.summary}
            </p>
          </section>

          {/* Deux colonnes sur desktop, une seule au mobile. */}
          <div className="space-y-3">
            <details className="inc-ai-disclosure" aria-labelledby="vigilance-ai-issues">
              <summary id="vigilance-ai-issues">Problèmes identifiés</summary>
              <VigilanceIssues context={context} issues={analysis.mainIssues} />
            </details>

            <details className="inc-ai-disclosure" aria-labelledby="vigilance-ai-positive">
              <summary id="vigilance-ai-positive">Signaux positifs</summary>
              <PositiveSignalsCard context={context} signals={analysis.positiveSignals} />
            </details>
          </div>

          <details className="inc-ai-disclosure" aria-labelledby="vigilance-ai-attention">
            <summary id="vigilance-ai-attention">Points à examiner</summary>
            <AttentionPointsCard points={analysis.attentionPoints} />
          </details>

          <details className="inc-ai-disclosure" aria-labelledby="vigilance-ai-actions">
            <summary id="vigilance-ai-actions">Actions suggérées</summary>
            <SuggestedActionsCard actions={analysis.suggestedActions} context={context} />
          </details>
        </div>
      )}
    </section>
  );
}
