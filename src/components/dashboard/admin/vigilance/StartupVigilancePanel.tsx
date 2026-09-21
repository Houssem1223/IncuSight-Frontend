"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  useAnalyzeStartupVigilance,
  useRefreshStartupVigilance,
  useStartupVigilance,
} from "@/src/hooks/useStartupVigilance";
import {
  getVigilanceErrorMessage,
  needsForcedRefresh,
  type EvidenceContext,
} from "@/src/lib/startup-vigilance-view";
import type { IncubationFollowUp } from "@/src/types/incubation-followups";
import StartupVigilanceScoreCard from "./StartupVigilanceScoreCard";
import VigilanceAiAnalysis from "./VigilanceAiAnalysis";
import VigilanceFactorsCard from "./VigilanceFactorsCard";

type StartupVigilancePanelProps = {
  sharedDetail?: boolean;
  followUpId: string;
  /**
   * Suivi déjà chargé par l'écran : il fournit les points d'avancement et les
   * objectifs qui permettent de nommer les sources citées par l'analyse, sans
   * requête supplémentaire.
   */
  followUp: IncubationFollowUp | null;
};

function PanelSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <div className="h-28 animate-pulse rounded-xl bg-background-accent" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-background-accent" />
        <div className="h-28 animate-pulse rounded-xl bg-background-accent" />
      </div>
    </div>
  );
}

/**
 * Vigilance d'un suivi d'incubation : score déterministe, facteurs, puis analyse
 * qualitative.
 *
 * Les deux moitiés sont distinctes à dessein — le score dit *qui* nécessite de
 * l'attention, l'analyse *pourquoi et sur quoi*. Aucune valeur n'est calculée
 * ici : tout vient du backend.
 */
export default function StartupVigilancePanel({
  followUp,
  followUpId,
  sharedDetail = false,
}: StartupVigilancePanelProps) {
  const vigilanceQuery = useStartupVigilance(followUpId, sharedDetail);
  const analyzeMutation = useAnalyzeStartupVigilance(followUpId);
  const refreshMutation = useRefreshStartupVigilance(followUpId);

  const detail = vigilanceQuery.data;
  const isGenerating = analyzeMutation.isPending || refreshMutation.isPending;

  const evidenceContext: EvidenceContext = {
    sources: detail?.evidenceSources ?? [],
    updates: followUp?.updates ?? [],
    objectives: followUp?.objectives ?? [],
  };

  // `analyze` suffit partout : le backend régénère de lui-même un cache périmé.
  // `refresh` n'est utile que pour remplacer une analyse encore valide.
  const handleGenerate = () => {
    if (detail && needsForcedRefresh(detail.ai.status)) {
      analyzeMutation.reset();
      refreshMutation.mutate();
      return;
    }

    refreshMutation.reset();
    analyzeMutation.mutate();
  };

  const requestError = refreshMutation.error ?? analyzeMutation.error ?? vigilanceQuery.error;

  return (
    <section
      aria-labelledby="startup-vigilance-panel-title"
      className="inc-vigilance-panel"
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
          Accompagnement
        </p>
        <h2
          className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          id="startup-vigilance-panel-title"
        >
          Vigilance & accompagnement
        </h2>
      </div>

      {vigilanceQuery.isPending && <PanelSkeleton />}

      {requestError && (
        <p
          className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{getVigilanceErrorMessage(requestError)}</span>
        </p>
      )}

      {vigilanceQuery.isError && (
        <Button
          className="mt-3"
          disabled={vigilanceQuery.isFetching}
          onClick={() => void vigilanceQuery.refetch()}
          size="sm"
          type="button"
          variant="outline"
        >
          Réessayer le chargement
        </Button>
      )}

      {detail && (
        <div className="mt-6 space-y-6">
          {/* Section 1 — quantitatif. */}
          <div className="grid gap-5">
            <StartupVigilanceScoreCard level={detail.level} score={detail.score} />
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
                Facteurs
              </h3>
              <div className="mt-3">
                <VigilanceFactorsCard factors={detail.factors} />
              </div>
            </div>
          </div>

          {/* Section 2 — qualitatif, nettement séparé du score. */}
          <VigilanceAiAnalysis
            context={evidenceContext}
            detail={detail}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </div>
      )}
    </section>
  );
}
