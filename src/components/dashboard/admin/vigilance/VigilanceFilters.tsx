"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/src/components/ui/forms";
import {
  VIGILANCE_LEVELS,
  VIGILANCE_PERIOD_OPTIONS,
  VIGILANCE_SORT_OPTIONS,
  getVigilanceLevelLabel,
} from "@/src/lib/startup-vigilance-view";
import {
  VIGILANCE_SEARCH_MAX_LENGTH,
  countActiveVigilanceFilters,
  hasNonDefaultVigilanceParams,
  type VigilanceListParamsState,
} from "@/src/lib/startup-vigilance-params";
import type {
  VigilanceLevel,
  VigilancePeriod,
  VigilanceSort,
} from "@/src/types/startup-vigilance";
import type { FollowUpPhase, FollowUpStatus } from "@/src/types/incubation-followups";
import {
  followUpStatusLabels,
  followUpStatuses,
  phaseLabels,
  phases,
} from "../followups/followupHelpers";

/**
 * Les sept filtres de la liste complète, extraits pour garder l'aperçu du
 * dashboard — qui n'en affiche aucun — lisible dans `StartupVigilanceOverview`.
 *
 * ⚠️ **Tous sont serveur.** Aucun `items.filter` n'existe dans cet écran : le
 * backend filtre en base, calcule les scores, applique `level` sur le classement
 * complet, trie, puis découpe. Filtrer après découpage ne montrerait que les
 * correspondances de la page.
 *
 * Statuts, phases et leurs libellés viennent de `followupHelpers` — les mêmes
 * enums Prisma que le reste de l'écran de suivi, pas une seconde liste.
 */

/** Ce que le composant a besoin de connaître d'un `Program`. */
export type VigilanceProgramOption = {
  id: string;
  title: string;
};

type VigilanceFiltersProps = {
  compact?: boolean;
  programs: VigilanceProgramOption[];
  params: VigilanceListParamsState;
  onParamsChange: (change: Partial<VigilanceListParamsState>) => void;
  onReset: () => void;
};

/**
 * Le champ de recherche est tenu localement et propagé après une pause de
 * frappe : sans cela, « HealthFlow » déclencherait dix requêtes et dix entrées
 * d'historique. 300 ms — le projet n'avait pas encore de debounce à réutiliser.
 */
const SEARCH_DEBOUNCE_MS = 300;

export default function VigilanceFilters({
  compact = false,
  onParamsChange,
  onReset,
  params,
  programs,
}: VigilanceFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(params.search);
  const [syncedSearch, setSyncedSearch] = useState(params.search);

  // Retour arrière du navigateur, reset, lien partagé : l'URL fait foi et le
  // champ doit suivre. Ajustement pendant le rendu — le motif documenté par
  // React pour recaler un état sur une prop, sans effet ni rendu en cascade.
  // La garde est ce qui évite la boucle : une fois recalé, la condition est
  // fausse. Une frappe en cours n'est pas écrasée : `syncedSearch` ne bouge
  // qu'au commit, et le commit pose déjà la même valeur.
  if (syncedSearch !== params.search) {
    setSyncedSearch(params.search);
    setSearchDraft(params.search);
  }

  useEffect(() => {
    if (searchDraft === syncedSearch) {
      return;
    }

    const timer = setTimeout(
      () => onParamsChange({ search: searchDraft }),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [onParamsChange, searchDraft, syncedSearch]);

  const activeFilters = countActiveVigilanceFilters(params);

  return (
    <div className={compact ? "inc-filters" : "mt-6 space-y-3"}>
      {/* Une colonne au mobile, puis deux, puis quatre : chaque champ garde son
          libellé au-dessus, jamais une icône seule. */}
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
        <FormField htmlFor="vigilance-filter-search" label="Rechercher une startup">
          <FormInput
            id="vigilance-filter-search"
            maxLength={VIGILANCE_SEARCH_MAX_LENGTH}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Nom de la startup"
            type="search"
            value={searchDraft}
          />
        </FormField>

        <details className={compact ? "inc-filter-disclosure" : "contents"} open={compact ? undefined : true}>
          <summary className={compact ? "inc-filter-toggle" : "hidden"}>Filtres et tri{activeFilters > 0 ? ` (${activeFilters})` : ""}</summary>
          <div className={compact ? "space-y-3 pt-3" : "contents"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
          Filtres{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </p>

        {hasNonDefaultVigilanceParams(params) && (
          <Button onClick={onReset} size="sm" type="button" variant="outline">
            Réinitialiser les filtres
          </Button>
        )}
      </div>

        <FormField htmlFor="vigilance-filter-program" label="Programme">
          <FormSelect
            id="vigilance-filter-program"
            // Valeur vide = tous les programmes : `programId` n'est alors pas
            // envoyé, et le backend ne restreint rien.
            onChange={(event) => onParamsChange({ programId: event.target.value || undefined })}
            value={params.programId ?? ""}
          >
            <option value="">Tous les programmes</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {/* ⚠️ Pas d'option « Tous les statuts » : le backend fait
            `status ?? ACTIVE`, il n'existe aucune valeur pour les quatre à la
            fois. Proposer un « tous » afficherait les seuls suivis actifs. */}
        <FormField htmlFor="vigilance-filter-status" label="Statut">
          <FormSelect
            id="vigilance-filter-status"
            onChange={(event) =>
              onParamsChange({ status: event.target.value as FollowUpStatus })
            }
            value={params.status}
          >
            {followUpStatuses.map((status) => (
              <option key={status} value={status}>
                {followUpStatusLabels[status]}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField htmlFor="vigilance-filter-phase" label="Phase">
          <FormSelect
            id="vigilance-filter-phase"
            onChange={(event) =>
              onParamsChange({ phase: (event.target.value || undefined) as FollowUpPhase | undefined })
            }
            value={params.phase ?? ""}
          >
            <option value="">Toutes les phases</option>
            {phases.map((phase) => (
              <option key={phase} value={phase}>
                {phaseLabels[phase]}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField htmlFor="vigilance-filter-level" label="Niveau de vigilance">
          <FormSelect
            id="vigilance-filter-level"
            onChange={(event) =>
              onParamsChange({ level: (event.target.value || undefined) as VigilanceLevel | undefined })
            }
            value={params.level ?? ""}
          >
            <option value="">Tous les niveaux</option>
            {VIGILANCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {getVigilanceLevelLabel(level)}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField htmlFor="vigilance-filter-period" label="Période de démarrage">
          <FormSelect
            id="vigilance-filter-period"
            onChange={(event) =>
              onParamsChange({ period: (event.target.value || undefined) as VigilancePeriod | undefined })
            }
            value={params.period ?? ""}
          >
            <option value="">Toutes les périodes</option>
            {VIGILANCE_PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {/* Mêmes champs que `DashboardFilterBar` pour la plage personnalisée.
            Tant que les deux ne sont pas saisies, la période n'est pas envoyée :
            `period=custom` sans bornes est un 400. */}
        {params.period === "custom" && (
          <>
            <FormField htmlFor="vigilance-filter-from" label="Du">
              <FormInput
                id="vigilance-filter-from"
                onChange={(event) => onParamsChange({ from: event.target.value || undefined })}
                type="date"
                value={params.from ?? ""}
              />
            </FormField>

            <FormField htmlFor="vigilance-filter-to" label="Au">
              <FormInput
                id="vigilance-filter-to"
                onChange={(event) => onParamsChange({ to: event.target.value || undefined })}
                type="date"
                value={params.to ?? ""}
              />
            </FormField>
          </>
        )}

        <FormField htmlFor="vigilance-filter-sort" label="Trier par">
          <FormSelect
            id="vigilance-filter-sort"
            onChange={(event) => onParamsChange({ sort: event.target.value as VigilanceSort })}
            value={params.sort}
          >
            {VIGILANCE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
          </div>
        </details>
      </div>
    </div>
  );
}
