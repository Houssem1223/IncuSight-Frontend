import type { Application } from "@/src/types/application";

export const statusOptions = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export const statusFilterOptions = ["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const;
export const viewModeOptions = ["TABLE", "KANBAN"] as const;

export type StatusFilter = (typeof statusFilterOptions)[number];
export type ViewMode = (typeof viewModeOptions)[number];
export type ApplicationStatusColumn = Exclude<StatusFilter, "ALL">;

export function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeStatus(value?: string): string {
  return (value || "PENDING").toUpperCase();
}

export function getStatusClass(status: string): string {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export function getProgramLabel(application: Application): string {
  if (application.program && typeof application.program.title === "string") {
    return application.program.title;
  }

  return application.programId;
}

export function getStartupLabel(application: Application): string {
  if (application.startup && typeof application.startup.startupName === "string") {
    return application.startup.startupName;
  }

  return application.startupId;
}
