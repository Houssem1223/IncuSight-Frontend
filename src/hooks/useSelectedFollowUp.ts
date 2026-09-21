"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Selection du master-detail des suivis d'incubation, portee par `?followUp=`.
 *
 * L'URL est l'unique source de verite : aucun `useState` ne la double. C'est ce
 * qui fait fonctionner Precedent/Suivant du navigateur sans effet de
 * synchronisation — et donc sans la boucle
 * `state -> replace -> effect -> state` qu'un miroir local imposerait.
 *
 * `push` et non `replace` : selectionner un dossier est une action de
 * l'administrateur, qui doit pouvoir l'annuler d'un Retour. Le drill-down
 * `?followUp=<id>` depuis le dashboard reste inchange.
 */
export type UseSelectedFollowUpResult = {
  /** Chaine vide quand aucun dossier n'est demande par l'URL. */
  selectedFollowUpId: string;
  selectFollowUp: (followUpId: string) => void;
};

export function useSelectedFollowUp(): UseSelectedFollowUpResult {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedFollowUpId = searchParams.get("followUp") ?? "";

  const selectFollowUp = useCallback(
    (followUpId: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (followUpId) {
        params.set("followUp", followUpId);
      } else {
        params.delete("followUp");
      }

      const query = params.toString();

      // Reselectionner le meme dossier empilerait une entree d'historique
      // identique, sur laquelle Retour semblerait ne rien faire.
      if (query === searchParams.toString()) {
        return;
      }

      // Next 16 synchronizes native history with useSearchParams. Selection
      // only changes client data, so it needs no Server Component navigation.
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  return { selectedFollowUpId, selectFollowUp };
}
