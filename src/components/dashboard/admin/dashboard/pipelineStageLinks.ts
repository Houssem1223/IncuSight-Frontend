import type { PipelineStageLabel } from "@/src/lib/dashboard-api";

export type PipelineStageLink = {
  href: string;
  barColorClassName: string;
};

// Les labels FR renvoyes par l'API ne sont pas des valeurs de filtre exploitables
// telles quelles — voir docs/dashboard-backend-api-contract.md §5.
export const pipelineStageLinks: Record<PipelineStageLabel, PipelineStageLink> = {
  Candidatures: {
    href: "/dashboard/admin/applications",
    barColorClassName: "bg-blue-500",
  },
  // Approximation documentee : `enEvaluation` (PENDING + evaluateur assigne) n'a pas
  // de filtre dedie sur la liste — PENDING est le plus proche disponible.
  "Évaluation": {
    href: "/dashboard/admin/applications?status=PENDING",
    barColorClassName: "bg-amber-500",
  },
  // Aucun filtre "decide" (ACCEPTED+REJECTED combines) n'existe sur la liste —
  // filtrer sur un seul des deux masquerait la moitie de la population.
  "Sélection": {
    href: "/dashboard/admin/applications",
    barColorClassName: "bg-purple-500",
  },
  Incubation: {
    href: "/dashboard/admin/incubation-followups",
    barColorClassName: "bg-emerald-500",
  },
};

export const defaultPipelineStageLink: PipelineStageLink = {
  href: "/dashboard/admin/applications",
  barColorClassName: "bg-slate-400",
};
