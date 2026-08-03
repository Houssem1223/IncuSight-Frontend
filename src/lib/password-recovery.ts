import { ApiError, apiFetch } from "./api";
import { isValidEmail } from "./auth-validation";

export const FORGOT_PASSWORD_COOLDOWN_SECONDS = 60;
export const FORGOT_PASSWORD_RATE_LIMIT_MESSAGE =
  "Trop de demandes, veuillez réessayer plus tard";
export const RESET_PASSWORD_SUCCESS_MESSAGE =
  "Mot de passe réinitialisé avec succès";
export const INVALID_RESET_LINK_MESSAGE =
  "Lien de réinitialisation invalide";
export const EXPIRED_RESET_LINK_MESSAGE =
  "Ce lien de réinitialisation est invalide, expiré ou a déjà été utilisé.";
export const RESET_PASSWORD_RATE_LIMIT_MESSAGE =
  "Trop de tentatives, veuillez réessayer plus tard";
export const PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE =
  "Une erreur réseau est survenue. Veuillez réessayer.";

export const RESET_PASSWORD_REQUIREMENTS = [
  "8 caractères minimum",
  "une lettre majuscule",
  "une lettre minuscule",
  "un chiffre",
  "un caractère spécial",
  "72 octets UTF-8 maximum",
] as const;

export type PasswordRecoveryResponse = {
  message: string;
};

export type ResetPasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordFieldErrors = Partial<
  Record<keyof ResetPasswordFormValues, string>
>;

type PasswordRecoveryRequester = (
  endpoint: string,
  options: RequestInit,
) => Promise<PasswordRecoveryResponse>;

const defaultRequester: PasswordRecoveryRequester = (endpoint, options) =>
  apiFetch<PasswordRecoveryResponse>(endpoint, options);

export function normalizePasswordRecoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getForgotPasswordEmailError(email: string): string | null {
  const normalizedEmail = normalizePasswordRecoveryEmail(email);

  if (!normalizedEmail) {
    return "L’adresse email est obligatoire.";
  }

  if (!isValidEmail(normalizedEmail)) {
    return "Saisissez une adresse email valide.";
  }

  return null;
}

export function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function getResetPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (getUtf8ByteLength(password) > 72) {
    return "Le mot de passe ne doit pas dépasser 72 octets UTF-8.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }

  return null;
}

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {};

  if (!values.newPassword) {
    errors.newPassword = "Le nouveau mot de passe est obligatoire.";
  } else {
    const passwordError = getResetPasswordValidationError(values.newPassword);

    if (passwordError) {
      errors.newPassword = passwordError;
    }
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "La confirmation du mot de passe est obligatoire.";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }

  return errors;
}

export function hasResetPasswordToken(
  token: string | null | undefined,
): token is string {
  return typeof token === "string" && token.trim().length > 0;
}

export function requestForgotPassword(
  email: string,
  request: PasswordRecoveryRequester = defaultRequester,
): Promise<PasswordRecoveryResponse> {
  return request("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: normalizePasswordRecoveryEmail(email) }),
  });
}

export function requestResetPassword(
  token: string | null | undefined,
  newPassword: string,
  request: PasswordRecoveryRequester = defaultRequester,
): Promise<PasswordRecoveryResponse> {
  if (!hasResetPasswordToken(token)) {
    return Promise.reject(new ApiError(INVALID_RESET_LINK_MESSAGE, 400));
  }

  return request("auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export function getForgotPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return FORGOT_PASSWORD_RATE_LIMIT_MESSAGE;
  }

  return PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE;
}

export function getResetPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return EXPIRED_RESET_LINK_MESSAGE;
    }

    if (error.status === 429) {
      return RESET_PASSWORD_RATE_LIMIT_MESSAGE;
    }
  }

  return PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE;
}
