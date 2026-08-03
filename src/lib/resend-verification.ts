import { ApiError } from "./api";

export const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60;
export const RESEND_RATE_LIMIT_MESSAGE =
  "Trop de demandes, veuillez réessayer plus tard";

export function getResendVerificationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 429 ? RESEND_RATE_LIMIT_MESSAGE : error.message;
  }

  return "Une erreur réseau est survenue. Veuillez réessayer.";
}
