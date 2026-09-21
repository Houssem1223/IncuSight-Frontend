"use client";

import { Button } from "@/src/components/ui/button";
import {
  formatVigilancePageStatus,
  formatVigilanceTotal,
} from "@/src/lib/startup-vigilance-view";
import type { StartupVigilancePagination } from "@/src/types/startup-vigilance";

/**
 * Pagination du classement, sur le modèle de celle des utilisateurs admin.
 *
 * ⚠️ Tout vient de l'enveloppe du serveur : c'est `hasNextPage` /
 * `hasPreviousPage` qui décident de l'état des boutons, et `totalItems` qui
 * donne le total. `items.length` ne compte que la page affichée et ne dit rien
 * de l'existence d'une page suivante.
 */

type VigilancePaginationProps = {
  pagination: StartupVigilancePagination;
  onPageChange: (page: number) => void;
};

export default function VigilancePagination({
  onPageChange,
  pagination,
}: VigilancePaginationProps) {
  return (
    <nav
      aria-label="Pagination de la vigilance des startups"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-foreground-muted">
        {formatVigilancePageStatus(pagination)}
        {" — "}
        {formatVigilanceTotal(pagination.totalItems)}
      </p>

      <div className="flex items-center gap-2">
        <Button
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Précédent
        </Button>
        <Button
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Suivant
        </Button>
      </div>
    </nav>
  );
}
