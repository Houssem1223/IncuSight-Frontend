export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
};

export type UserRole = "ADMIN" | "STARTUP" | "EVALUATOR";

export type { User } from "./user";