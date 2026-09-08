// `type` est un NotificationType Prisma renvoye en `string` cote frontend (aucun enum
// clos disponible ici, voir src/types/notification.ts) — mapping best-effort avec
// repli par defaut obligatoire pour ne jamais planter sur une valeur non prevue.

const EXACT_DOT_CLASSNAMES: Record<string, string> = {
  APPLICATION_SUBMITTED: "bg-amber-500",
  APPLICATION_ACCEPTED: "bg-emerald-500",
  APPLICATION_REJECTED: "bg-red-500",
  EVALUATION_ASSIGNED: "bg-blue-500",
  EVALUATION_SUBMITTED: "bg-blue-500",
  DECISION_MADE: "bg-emerald-500",
  PROGRAM_CREATED: "bg-purple-500",
  FOLLOWUP_UPDATE_SUBMITTED: "bg-purple-500",
};

const DEFAULT_DOT_CLASSNAME = "bg-slate-400";

export function getActivityDotClassName(type: string): string {
  const exact = EXACT_DOT_CLASSNAMES[type];

  if (exact) {
    return exact;
  }

  const normalized = type.toUpperCase();

  if (normalized.includes("REJECT")) {
    return "bg-red-500";
  }

  if (normalized.includes("ACCEPT") || normalized.includes("DECISION")) {
    return "bg-emerald-500";
  }

  if (normalized.includes("EVALUAT")) {
    return "bg-blue-500";
  }

  if (normalized.includes("SUBMIT") || normalized.includes("APPLICATION")) {
    return "bg-amber-500";
  }

  return DEFAULT_DOT_CLASSNAME;
}
