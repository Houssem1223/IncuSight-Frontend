import type { Program } from "./program";
import type { Startup } from "./startup";

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | string;

export type Decision = {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  comment?: string | null;
  decidedById: string;
  decidedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type Application = {
  id: string;
  startupId: string;
  programId: string;
  motivationLetter?: string;
  status?: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
  startup?: Startup;
  program?: Program;
  decision?: Decision | null;
  [key: string]: unknown;
};
