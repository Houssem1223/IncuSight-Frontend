import type { Application } from "@/src/types/application";
import type {
  FollowUpObjectivePriority,
  FollowUpObjectiveStatus,
  FollowUpPhase,
  FollowUpStatus,
  IncubationFollowUp,
} from "@/src/types/incubation-followups";

export const followUpStatuses: FollowUpStatus[] = ["ACTIVE", "COMPLETED", "SUSPENDED", "DROPPED"];
export const objectiveStatuses: FollowUpObjectiveStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
export const objectivePriorities: FollowUpObjectivePriority[] = ["LOW", "MEDIUM", "HIGH"];

export const followUpStatusLabels: Record<FollowUpStatus, string> = {
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  SUSPENDED: "Suspendu",
  DROPPED: "Abandonné",
};

export const phaseLabels: Record<FollowUpPhase, string> = {
  ONBOARDING: "Intégration",
  DIAGNOSTIC: "Diagnostic",
  BUILD: "Construction",
  MARKET_VALIDATION: "Validation marché",
  PITCH_PREPARATION: "Préparation du pitch",
  CLOSING: "Clôture",
};

export const objectiveStatusLabels: Record<FollowUpObjectiveStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
  BLOCKED: "Bloqué",
};

export const priorityLabels: Record<FollowUpObjectivePriority, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
};

export type ObjectiveFormState = {
  title: string;
  description: string;
  priority: FollowUpObjectivePriority;
  status: FollowUpObjectiveStatus;
  progress: string;
  deadlineAt: string;
};

export const emptyObjectiveForm: ObjectiveFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  progress: "0",
  deadlineAt: "",
};

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function formatDate(value?: string | null, includeTime = false): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

export function toDateInputValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function getApplicationLabel(application: Application): string {
  const startup = application.startup?.startupName || application.startupId;
  const program = application.program?.title || application.programId;
  return `${startup} — ${program}`;
}

export function getFollowUpLabel(followUp: IncubationFollowUp): string {
  return followUp.startup?.startupName || followUp.startupId;
}

export function getReportedProgress(followUp: IncubationFollowUp): number {
  const latestReportedProgress = followUp.updates?.find(
    (update) => typeof update.progress === "number",
  )?.progress;

  return clampProgress(latestReportedProgress ?? followUp.progress ?? 0);
}

export function followUpStatusClass(status: FollowUpStatus): string {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SUSPENDED" || status === "DROPPED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function objectiveStatusClass(status: FollowUpObjectiveStatus): string {
  if (status === "DONE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "BLOCKED") {
    return "bg-red-50 text-red-700";
  }

  if (status === "IN_PROGRESS") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-700";
}
