import { ApiError, apiFetch } from "./api";
import { isVerificationTokenValid } from "./auth-validation";

export type VerificationResponse = {
  message: string;
};

export type VerificationState = "loading" | "success" | "invalid" | "network";

type VerificationRequester = (endpoint: string) => Promise<VerificationResponse>;

const pendingVerifications = new Map<string, Promise<VerificationResponse>>();

export function getInitialVerificationState(token?: string): VerificationState {
  return isVerificationTokenValid(token) ? "loading" : "invalid";
}

export function classifyVerificationError(error: unknown): Exclude<VerificationState, "loading" | "success"> {
  if (error instanceof ApiError) {
    const isUnavailableEndpoint =
      error.status === 404 && error.message.toLowerCase().includes("cannot get");

    if (!isUnavailableEndpoint && [400, 401, 403, 404, 409, 410, 422].includes(error.status)) {
      return "invalid";
    }
  }

  return "network";
}

export function verifyEmailOnce(
  token: string,
  request: VerificationRequester = (endpoint) => apiFetch<VerificationResponse>(endpoint),
): Promise<VerificationResponse> {
  if (!isVerificationTokenValid(token)) {
    return Promise.reject(new ApiError("Lien invalide ou expiré", 400));
  }

  const pendingRequest = pendingVerifications.get(token);

  if (pendingRequest) {
    return pendingRequest;
  }

  const endpoint = `auth/verify-email?token=${encodeURIComponent(token)}`;
  const requestPromise = request(endpoint).finally(() => {
    if (pendingVerifications.get(token) === requestPromise) {
      pendingVerifications.delete(token);
    }
  });

  pendingVerifications.set(token, requestPromise);
  return requestPromise;
}
