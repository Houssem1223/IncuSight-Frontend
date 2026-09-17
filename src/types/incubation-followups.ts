import type { Application } from "./application";
import type { Program } from "./program";
import type { Startup } from "./startup";
import type { User } from "./user";

export type FollowUpStatus = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "DROPPED";
export type FollowUpPhase = "ONBOARDING" | "DIAGNOSTIC" | "BUILD" | "MARKET_VALIDATION" | "PITCH_PREPARATION" | "CLOSING";
export type FollowUpObjectivePriority = "LOW" | "MEDIUM" | "HIGH";
export type FollowUpObjectiveStatus = "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";

export type FollowUpAuthor = Pick<User, "id" | "email" | "role">;

export type FollowUpObjective = {
  id: string;
  followUpId: string;
  title: string;
  description?: string | null;
  status?: FollowUpObjectiveStatus;
  priority?: FollowUpObjectivePriority;
  progress?: number;
  deadlineAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

// storagePath n'est jamais expose par l'API : c'est un detail de stockage serveur.
export type FollowUpAttachment = {
  id: string;
  updateId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt?: string;
  // Seule une STARTUP depose un livrable : c'est cote admin que savoir qui l'a
  // depose renseigne. Le champ etait ecrit en base et expose par personne.
  uploadedById?: string;
  uploadedBy?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  [key: string]: unknown;
};

export type FollowUpUpdate = {
  id: string;
  followUpId: string;
  authorId: string;
  title?: string | null;
  done: string;
  blockers?: string | null;
  needs?: string | null;
  nextSteps?: string | null;
  progress?: number | null;
  createdAt?: string;
  updatedAt?: string;
  author?: FollowUpAuthor;
  attachments?: FollowUpAttachment[];
  [key: string]: unknown;
};

export type IncubationFollowUp = {
  id: string;
  applicationId: string;
  startupId: string;
  programId: string;
  status?: FollowUpStatus;
  phase?: FollowUpPhase;
  progress?: number;
  notes?: string | null;
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  application?: Application;
  startup?: Startup;
  program?: Program;
  objectives?: FollowUpObjective[];
  updates?: FollowUpUpdate[];
  [key: string]: unknown;
};

export type CreateFollowUpObjectivePayload = {
  title: string;
  description?: string;
  priority?: FollowUpObjectivePriority;
  deadlineAt?: string;
};

export type UpdateFollowUpObjectivePayload = Partial<{
  title: string;
  description: string;
  priority: FollowUpObjectivePriority;
  deadlineAt: string;
  progress: number;
  status: FollowUpObjectiveStatus;
}>;

export type UpdateFollowUpObjectiveProgressPayload = {
  progress: number;
  status: FollowUpObjectiveStatus;
};

export type CreateFollowUpUpdatePayload = {
  title?: string;
  done: string;
  blockers?: string;
  needs?: string;
  nextSteps?: string;
  progress?: number;
};

export type UpdateFollowUpPayload = Partial<{
  status: FollowUpStatus;
  phase: FollowUpPhase;
  notes: string;
  endDate: string;
}>;
