import type { Insight } from "@/src/lib/dashboard-api";

// insight.actionUrl vient du backend et ne correspond à aucune route réelle du front
// (écrit avant que ces pages existent) — on l'ignore et on route nous-mêmes à partir de
// insight.id, qui est documenté comme un identifiant stable de la règle. Les deux
// derniers cas n'ont pas de destination précise disponible aujourd'hui (aucune page ne
// filtre encore par programId) : on désactive le lien plutôt que d'en proposer un faux.
export function resolveInsightHref(insight: Insight): string | null {
  switch (true) {
    case insight.id === "blocked-objectives":
    case insight.id === "stale-followups":
      return "/dashboard/admin/incubation-followups";

    case insight.id === "stale-unassigned-applications":
    case insight.id === "overdue-evaluations":
      return "/dashboard/admin/applications?status=PENDING";

    case insight.id.startsWith("low-acceptance-rate:"):
      return "/dashboard/admin/applications";

    default:
      return null;
  }
}
