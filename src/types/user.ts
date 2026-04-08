import type { UserRole } from "./auth";

export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};