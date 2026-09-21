import type { ReactNode } from "react";
import type { VigilanceTone } from "@/src/lib/startup-vigilance-view";

/**
 * Pastille de niveau, partagée par la liste, le score et l'analyse IA.
 *
 * Mêmes teintes que les sévérités d'`InsightsCard` : le dashboard utilise déjà
 * ce jeu neutre/bleu/ambre/rouge, il n'y a pas de variante de `Badge` à
 * réutiliser pour un état sémantique.
 *
 * ⚠️ Le libellé est obligatoire : aucune information de ce composant n'est
 * portée par la seule couleur.
 */

export default function VigilanceBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: VigilanceTone;
}) {
  return (
    <span
      className="semantic-badge" data-tone={tone}
    >
      {children}
    </span>
  );
}
