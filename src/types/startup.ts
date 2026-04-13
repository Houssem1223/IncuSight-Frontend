import type { User } from "./user";

export type Startup = {
  id: string;
  startupName: string;
  description?: string;
  sector?: string;
  stage?: string;
  website?: string;
  ownerId: string;
  status?: string;
  owner?: User;
  createdAt?: string;
  updatedAt?: string;
};
