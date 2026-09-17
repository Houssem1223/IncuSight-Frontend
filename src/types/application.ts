import type { Program } from "./program";
import type { Startup } from "./startup";

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | string;

/**
 * Rectification d'une decision deja rendue. `revisedBy` n'est servi qu'a l'admin :
 * l'identite de l'administrateur decideur est tenue hors de la vue candidat, au
 * meme titre que `decidedById` (voir DECISION_REVISION_*_SELECT cote backend).
 */
export type DecisionRevision = {
  id: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  reason: string;
  revisedAt?: string;
  revisedBy?: {
    id: string;
    email?: string;
  };
  [key: string]: unknown;
};

export type Decision = {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  comment?: string | null;
  decidedById: string;
  decidedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Du plus recent au plus ancien, deja trie par le backend. */
  revisions?: DecisionRevision[];
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
