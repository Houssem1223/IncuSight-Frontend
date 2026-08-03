export type LoginPayload = {
  email: string;
  password: string;
};

export type SignupPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SignupUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SignupResponse = {
  message: string;
  user: SignupUser;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
};

export type UserRole = "ADMIN" | "STARTUP" | "EVALUATOR";

export type { User } from "./user";
