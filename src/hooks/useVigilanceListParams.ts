"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  applyVigilanceListParamChange,
  parseVigilanceListParams,
  resetVigilanceListParams,
  writeVigilanceListParams,
  type VigilanceListParamsState,
} from "@/src/lib/startup-vigilance-params";

/**
 * Les sept filtres, la page et le tri du classement de vigilance, **portés par
 * l'URL**.
 *
 * `useSearchParams` est l'unique source de vérité : aucun état local ne le
 * double, donc il n'y a ni désynchronisation, ni boucle
 * `state → replace → effect → state`. Le retour arrière du navigateur remet
 * l'URL précédente, `useSearchParams` change, le composant se re-rend et
 * TanStack Query relit la clé correspondante — il n'y a rien à synchroniser.
 *
 * ⚠️ `push` et non `replace` pour les actions de l'administrateur : avec
 * `replace`, « Programme A → Programme B → Retour » ne reviendrait pas à A,
 * faute d'entrée d'historique. Les corrections **automatiques** (page hors
 * limites) passent au contraire par `replace`, pour ne pas semer des entrées
 * que l'utilisateur n'a pas demandées et sur lesquelles Retour rebondirait.
 *
 * ⚠️ `writeVigilanceListParams` repart des paramètres existants : `followUp`,
 * qui porte la sélection du master-detail, n'est jamais perdu.
 *
 * Toute la logique (valeurs par défaut, remise à la page 1, nettoyage des
 * valeurs par défaut) vit dans `startup-vigilance-params.ts`, testée sans
 * routeur. Ce hook ne fait que la brancher.
 */
export type VigilanceParamsChangeOptions = {
  /** `true` pour une correction automatique : aucune entrée d'historique. */
  replace?: boolean;
};

export type UseVigilanceListParamsResult = {
  params: VigilanceListParamsState;
  setParams: (
    change: Partial<VigilanceListParamsState>,
    options?: VigilanceParamsChangeOptions,
  ) => void;
  resetParams: () => void;
};

export function useVigilanceListParams(): UseVigilanceListParamsResult {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(() => parseVigilanceListParams(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: VigilanceListParamsState, options?: VigilanceParamsChangeOptions) => {
      const query = writeVigilanceListParams(searchParams, next).toString();
      const href = query ? `${pathname}?${query}` : pathname;

      // Réécrire la même URL n'apporterait rien et empilerait des entrées
      // d'historique identiques, sur lesquelles Retour semblerait ne rien faire.
      const current = searchParams.toString();
      if (query === current) {
        return;
      }

      if (options?.replace) {
        window.history.replaceState(null, "", href);
      } else {
        window.history.pushState(null, "", href);
      }
    },
    [pathname, searchParams],
  );

  const setParams = useCallback(
    (
      change: Partial<VigilanceListParamsState>,
      options?: VigilanceParamsChangeOptions,
    ) => {
      navigate(
        applyVigilanceListParamChange(parseVigilanceListParams(searchParams), change),
        options,
      );
    },
    [navigate, searchParams],
  );

  // Le reset est une action explicite : elle mérite son entrée d'historique,
  // pour être annulable d'un Retour.
  const resetParams = useCallback(() => {
    navigate(resetVigilanceListParams());
  }, [navigate]);

  return { params, setParams, resetParams };
}
