import type { User } from "./user";

export type StartupProfileStatus = "DRAFT" | "PUBLISHED";

export type Startup = {
  id: string;
  startupName: string;
  description?: string;
  sector?: string;
  stage?: string;
  website?: string;
  ownerId: string;
  status?: StartupProfileStatus;
  // pitchDeckPath et logoPath sont des details de stockage serveur, jamais exposes a l'UI.
  pitchDeckOriginalName?: string;
  pitchDeckMimeType?: string;
  pitchDeckSize?: number;
  pitchDeckUploadedAt?: string;
  logoOriginalName?: string;
  logoMimeType?: string;
  logoSize?: number;
  logoUploadedAt?: string;
  linkedinUrl?: string;
  deckUrl?: string;
  // Opt-in explicite a la vitrine publique (voir /startups).
  isPublicShowcase?: boolean;
  owner?: User;
  createdAt?: string;
  updatedAt?: string;
};
