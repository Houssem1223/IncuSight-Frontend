import type { Program } from "./program";
import type { Startup } from "./startup";

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | string;

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
  [key: string]: unknown;
};
