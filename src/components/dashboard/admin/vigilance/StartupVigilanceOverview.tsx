"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useStartupVigilanceList } from "@/src/hooks/useStartupVigilance";
import {
  DEFAULT_VIGILANCE_LIST_PARAMS,
  DEFAULT_VIGILANCE_PAGE,
  DEFAULT_VIGILANCE_SORT,
  VIGILANCE_LIST_PAGE_SIZE,
  VIGILANCE_TOP_LIMIT,
  getOutOfRangeVigilancePage,
  toVigilanceListQuery,
  type VigilanceListParamsState,
} from "@/src/lib/startup-vigilance-params";
import {
  EMPTY_VIGILANCE_PAGE_MESSAGE,
  NO_ELEVATED_VIGILANCE_MESSAGE,
  VIGILANCE_SCORE_DISCLAIMER,
  formatVigilanceProgress,
  formatVigilanceScore,
  getVigilanceEmptyMessage,
  getVigilanceLevelLabel,
  getVigilanceLevelTone,
  getVigilanceListErrorMessage,
  getVigilanceRepresentativeProgress,
  hasElevatedVigilance,
  type VigilanceOverviewVariant,
} from "@/src/lib/startup-vigilance-view";
import { phaseLabels } from "../followups/followupHelpers";
import VigilanceBadge from "./VigilanceBadge";
import VigilanceFilters, { type VigilanceProgramOption } from "./VigilanceFilters";
import VigilancePagination from "./VigilancePagination";

/**
 * Classement de vigilance, monté à deux endroits avec deux variantes :
 *
 * - `top` (`/dashboard/admin`) — les cinq premiers suivis, sans filtre ni
 *   pagination, avec un lien vers l'écran de suivi ;
 * - `list` (`/dashboard/admin/incubation-followups`) — la liste complète, avec
 *   recherche, programme, statut, phase, niveau, période, tri et pagination,
 *   **tous appliqués par le serveur**.
 *
 * Un seul composant, un seul tableau : les deux emplacements partagent le même
 * rendu de ligne, seuls l'en-tête et les contrôles diffèrent.
 */

type StartupVigilanceOverviewProps = {
  /** Aperçu du dashboard ou liste complète. Par défaut : la liste complète. */
  variant?: VigilanceOverviewVariant;
  /**
   * Les sept filtres, la page et le tri. En variante `top`, page et tri sont
   * forçés aux défauts ; les filtres globaux du dashboard compatibles avec
   * cette route arrivent déjà posés dans cet objet.
   */
  params?: VigilanceListParamsState;
  /** Absent en variante `top` : l'aperçu n'a aucun contrôle. */
  onParamsChange?: (change: Partial<VigilanceListParamsState>) => void;
  /** Remise à zéro des filtres ; absent en variante `top`. */
  onReset?: () => void;
  /**
   * Programmes proposés par le filtre. Vient de `ProgramContext`, la source déjà
   * utilisée par les filtres du dashboard : le classement ne connaît que les
   * programmes ayant un suivi actif, ce qui ne suffit pas à peupler un Select.
   */
  programs?: VigilanceProgramOption[];
  /**
   * Fourni par l'écran de suivi, qui sélectionne le dossier sur place.
   * Absent depuis le dashboard : on renvoie alors vers l'écran de suivi.
   */
  onSelectFollowUp?: (followUpId: string) => void;
  /** Identifiant sélectionné, pour marquer la ligne courante. */
  activeFollowUpId?: string;
};

const FOLLOW_UPS_ROUTE = "/dashboard/admin/incubation-followups";

export default function StartupVigilanceOverview({
  activeFollowUpId,
  onParamsChange,
  onReset,
  onSelectFollowUp,
  params = DEFAULT_VIGILANCE_LIST_PARAMS,
  programs = [],
  variant = "list",
}: StartupVigilanceOverviewProps) {
  const isTop = variant === "top";

  // L'aperçu est figé sur la première page du tri par défaut ; les filtres
  // globaux du dashboard compatibles avec cette route le traversent tels quels
  // (le composant parent décide lesquels).
  const requestedParams: VigilanceListParamsState = isTop
    ? { ...params, page: DEFAULT_VIGILANCE_PAGE, sort: DEFAULT_VIGILANCE_SORT }
    : params;

  // Une seule requête pour la page affichée : jamais un appel par startup, et
  // aucune génération d'analyse depuis cet écran.
  const listQuery = useStartupVigilanceList(
    toVigilanceListQuery(
      requestedParams,
      isTop ? VIGILANCE_TOP_LIMIT : VIGILANCE_LIST_PAGE_SIZE,
    ),
  );

  // ⚠️ Enveloppe du backend : `items` est la page, `pagination` fait foi pour le
  // total et pour l'existence d'une page suivante.
  // Aucun retraitement : ni tri, ni filtre, ni découpage. Les sept filtres
  // métier, `level` compris, sont appliqués par le serveur avant pagination.
  const items = listQuery.data?.items ?? [];
  const pagination = listQuery.data?.pagination;

  // Page au-delà du dernier rang : le backend conserve la page demandée et
  // répond une liste vide. On ne corrige que vers la page 1, qui existe dès
  // qu'il reste un résultat — et seulement si on n'y est pas déjà, sans quoi la
  // page précédente encore affichée relancerait la correction en boucle.
  const outOfRangePage = isTop ? null : getOutOfRangeVigilancePage(pagination);

  useEffect(() => {
    if (outOfRangePage !== null && params.page !== outOfRangePage) {
      onParamsChange?.({ page: outOfRangePage });
    }
  }, [onParamsChange, outOfRangePage, params.page]);

  const isEmptyResult = pagination !== undefined && pagination.totalItems === 0;
  const isEmptyPage = pagination !== undefined && !isEmptyResult && items.length === 0;
  // Pendant un changement de page ou de filtre, la page précédente reste
  // affichée : on l'atténue plutôt que de vider le tableau.
  const isStale = listQuery.isPlaceholderData;

  return (
    <section
      aria-busy={listQuery.isFetching}
      aria-labelledby="startup-vigilance-overview-title"
      className="motion-rise dashboard-surface p-6"
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
          Accompagnement
        </p>
        <h2
          className="mt-2 text-xl font-semibold tracking-tight text-foreground md:text-2xl"
          id="startup-vigilance-overview-title"
        >
          {isTop ? "Startups nécessitant une attention" : "Startups à suivre"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
          {VIGILANCE_SCORE_DISCLAIMER}
        </p>
      </div>

      {!isTop && onParamsChange && onReset && (
        <VigilanceFilters
          onParamsChange={onParamsChange}
          onReset={onReset}
          params={params}
          programs={programs}
        />
      )}

      {listQuery.isPending && (
        <div className="mt-6 space-y-2">
          <div className="h-12 animate-pulse rounded-xl bg-background-accent" />
          <div className="h-12 animate-pulse rounded-xl bg-background-accent" />
          <div className="h-12 animate-pulse rounded-xl bg-background-accent" />
        </div>
      )}

      {listQuery.isError && (
        <>
          <p
            className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{getVigilanceListErrorMessage(listQuery.error, variant)}</span>
          </p>
          <Button
            className="mt-3"
            disabled={listQuery.isFetching}
            onClick={() => void listQuery.refetch()}
            size="sm"
            type="button"
            variant="outline"
          >
            Réessayer le chargement
          </Button>
        </>
      )}

      {/* Cinq scores faibles ne sont pas une alerte : on le dit, sans masquer
          les lignes ni les scores. */}
      {isTop && items.length > 0 && !hasElevatedVigilance(items) && (
        <p
          className="mt-6 rounded-xl border border-border/75 bg-background-accent px-3 py-3 text-sm text-foreground-muted"
          role="status"
        >
          {NO_ELEVATED_VIGILANCE_MESSAGE}
        </p>
      )}

      {isEmptyResult && (
        <p className="mt-6 rounded-xl border border-border/75 bg-background-accent px-3 py-3 text-sm text-foreground-muted">
          {getVigilanceEmptyMessage(params)}
        </p>
      )}

      {isEmptyPage && (
        <p className="mt-6 rounded-xl border border-border/75 bg-background-accent px-3 py-3 text-sm text-foreground-muted">
          {EMPTY_VIGILANCE_PAGE_MESSAGE}
        </p>
      )}

      {items.length > 0 && (
        // Le tableau reste lisible au mobile grâce au défilement horizontal de ce
        // conteneur : c'est la solution déjà employée par les autres écrans admin.
        <div
          className={`mt-6 overflow-x-auto rounded-xl border border-border/75 bg-surface transition-opacity ${
            isStale ? "opacity-60" : ""
          }`}
        >
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">
              Suivis d’incubation actifs classés par niveau de vigilance
            </caption>
            <thead className="bg-background-accent text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
                  Startup
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Programme
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Phase
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Progression
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Vigilance
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  className={`border-t border-border/60 ${
                    item.followUpId === activeFollowUpId ? "bg-background-accent/60" : ""
                  }`}
                  key={item.followUpId}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.startupName}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{item.programName}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {phaseLabels[item.phase] ?? item.phase}
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {formatVigilanceProgress(getVigilanceRepresentativeProgress(item))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {formatVigilanceScore(item.score)}
                      </span>
                      <VigilanceBadge tone={getVigilanceLevelTone(item.level)}>
                        {getVigilanceLevelLabel(item.level)}
                      </VigilanceBadge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {onSelectFollowUp ? (
                      <Button
                        onClick={() => onSelectFollowUp(item.followUpId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Voir le suivi
                      </Button>
                    ) : (
                      <Link
                        className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        href={`${FOLLOW_UPS_ROUTE}?followUp=${encodeURIComponent(item.followUpId)}`}
                      >
                        Voir le suivi
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Le lien ne transporte ni page ni limite : la liste complète repart de
          ses propres valeurs par défaut. */}
      {isTop && (
        <Link
          className="mt-4 inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          href={FOLLOW_UPS_ROUTE}
        >
          Voir tous les suivis
        </Link>
      )}

      {!isTop && pagination && !isEmptyResult && onParamsChange && (
        <VigilancePagination
          onPageChange={(page) => onParamsChange({ page })}
          pagination={pagination}
        />
      )}
    </section>
  );
}
