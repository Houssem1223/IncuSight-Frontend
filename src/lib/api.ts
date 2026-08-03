const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export const ACCESS_TOKEN_KEY = "token";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const AUTH_TOKEN_UPDATED_EVENT = "incusight:auth-token-updated";
export const AUTH_SESSION_EXPIRED_EVENT = "incusight:auth-session-expired";
export const SESSION_EXPIRED_MESSAGE =
  "Votre session a expiré. Veuillez vous reconnecter.";

const REFRESH_ENDPOINT = "auth/refresh-token";
const ENDPOINTS_WITHOUT_REFRESH = new Set([
  "auth/sign-in",
  REFRESH_ENDPOINT,
  "auth/logout",
  "users/signup",
  "auth/forgot-password",
  "auth/reset-password",
  "auth/resend-verification-email",
  "auth/verify-email",
  "program/public",
]);
const ENDPOINTS_WITHOUT_BEARER = new Set([
  "auth/sign-in",
  REFRESH_ENDPOINT,
  "users/signup",
  "auth/forgot-password",
  "auth/reset-password",
  "auth/resend-verification-email",
  "auth/verify-email",
  "program/public",
]);

export type SessionClearReason = "logout" | "expired";

export type SessionClearedEventDetail = {
  reason: SessionClearReason;
  message?: string;
};

type RefreshResult = {
  token: string;
  refreshToken: string;
};

type ApiRequestOptions = RequestInit & {
  _retry?: boolean;
};

type JsonResponse = {
  response: Response;
  data: unknown;
};

type RefreshState = {
  sessionIdentity: number;
  promise: Promise<RefreshResult>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let refreshState: RefreshState | null = null;
let hasHandledSessionExpiration = false;
let sessionIdentity = 0;

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeToken(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (
    !normalized ||
    normalized.toLowerCase() === "null" ||
    normalized.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return normalized;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/^\/+/, "");
}

function getEndpointPath(endpoint: string): string {
  return normalizeEndpoint(endpoint).split("?", 1)[0];
}

function buildApiUrl(endpoint: string): string {
  if (!API_URL) {
    throw new ApiError(
      "La configuration de l’API est manquante. Vérifiez NEXT_PUBLIC_API_URL.",
      0,
    );
  }

  return `${API_URL}/${normalizeEndpoint(endpoint)}`;
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const message = (data as Record<string, unknown>).message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }

  return null;
}

function extractRefreshResult(data: unknown): RefreshResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const token = normalizeToken(typeof record.token === "string" ? record.token : null);
  const refreshToken = normalizeToken(
    typeof record.refreshToken === "string" ? record.refreshToken : null,
  );

  if (!token || !refreshToken) {
    return null;
  }

  return { token, refreshToken };
}

function emitTokenUpdated(result: RefreshResult): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_UPDATED_EVENT, {
      detail: result,
    }),
  );
}

function emitSessionCleared(detail: SessionClearedEventDetail): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SessionClearedEventDetail>(AUTH_SESSION_EXPIRED_EVENT, {
      detail,
    }),
  );
}

export function getAccessToken(): string | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  return normalizeToken(localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function getRefreshToken(): string | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  return normalizeToken(localStorage.getItem(REFRESH_TOKEN_KEY));
}

function persistSession(
  accessToken: string,
  refreshToken: string,
  source: "login" | "refresh",
): void {
  const normalizedAccessToken = normalizeToken(accessToken);
  const normalizedRefreshToken = normalizeToken(refreshToken);

  if (!normalizedAccessToken || !normalizedRefreshToken) {
    throw new Error("La réponse d’authentification est incomplète.");
  }

  if (canUseBrowserStorage()) {
    localStorage.setItem(ACCESS_TOKEN_KEY, normalizedAccessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, normalizedRefreshToken);
  }

  if (source === "login") {
    sessionIdentity += 1;
  }

  hasHandledSessionExpiration = false;
  emitTokenUpdated({
    token: normalizedAccessToken,
    refreshToken: normalizedRefreshToken,
  });
}

export function saveSession(accessToken: string, refreshToken: string): void {
  persistSession(accessToken, refreshToken, "login");
}

export function clearSession(reason: SessionClearReason = "logout"): void {
  sessionIdentity += 1;

  if (canUseBrowserStorage()) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  emitSessionCleared({
    reason,
    ...(reason === "expired" ? { message: SESSION_EXPIRED_MESSAGE } : {}),
  });
}

function expireSessionOnce(): void {
  if (hasHandledSessionExpiration) {
    return;
  }

  hasHandledSessionExpiration = true;
  clearSession("expired");
}

async function parseResponseData(response: Response): Promise<unknown> {
  const body = await response.text();

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

async function requestJson(
  endpoint: string,
  options: ApiRequestOptions = {},
  token?: string | null,
): Promise<JsonResponse> {
  const { _retry, ...requestOptions } = options;
  void _retry;

  const headers = new Headers(requestOptions.headers);
  const normalizedAccessToken = normalizeToken(token);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (normalizedAccessToken) {
    headers.set("Authorization", `Bearer ${normalizedAccessToken}`);
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...requestOptions,
    headers,
  });
  const data = await parseResponseData(response);

  return { response, data };
}

export async function refreshAccessToken(): Promise<string> {
  const currentSessionIdentity = sessionIdentity;

  if (!refreshState || refreshState.sessionIdentity !== currentSessionIdentity) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      expireSessionOnce();
      throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
    }

    const promise = requestJson(REFRESH_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    })
      .then(({ response, data }) => {
        if (!response.ok) {
          throw new ApiError(
            extractErrorMessage(data) || SESSION_EXPIRED_MESSAGE,
            response.status,
            data,
          );
        }

        const result = extractRefreshResult(data);

        if (!result) {
          throw new ApiError("Réponse de renouvellement invalide.", response.status, data);
        }

        if (
          sessionIdentity !== currentSessionIdentity ||
          getRefreshToken() !== refreshToken
        ) {
          throw new ApiError("La session a changé pendant son renouvellement.", 409);
        }

        persistSession(result.token, result.refreshToken, "refresh");
        return result;
      })
      .catch((error: unknown) => {
        if (sessionIdentity === currentSessionIdentity) {
          expireSessionOnce();
        }
        throw error;
      });

    refreshState = {
      sessionIdentity: currentSessionIdentity,
      promise,
    };
  }

  const activeRefresh = refreshState;

  try {
    return (await activeRefresh.promise).token;
  } finally {
    if (refreshState === activeRefresh) {
      refreshState = null;
    }
  }
}

function toApiError(response: Response, data: unknown): ApiError {
  return new ApiError(
    extractErrorMessage(data) || `La requête a échoué (${response.status}).`,
    response.status,
    data,
  );
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
  token?: string,
): Promise<T> {
  const endpointPath = getEndpointPath(endpoint);
  const requestSessionIdentity = sessionIdentity;
  const explicitToken = normalizeToken(token);
  const requestToken =
    explicitToken ||
    (ENDPOINTS_WITHOUT_BEARER.has(endpointPath) ? null : getAccessToken());
  const tracksSession = !ENDPOINTS_WITHOUT_REFRESH.has(endpointPath);
  const { response, data } = await requestJson(endpoint, options, requestToken);

  if (tracksSession && sessionIdentity !== requestSessionIdentity) {
    throw new ApiError("Cette requête appartient à une session qui n’est plus active.", 409);
  }

  if (response.ok) {
    return data as T;
  }

  const canAttemptRefresh =
    response.status === 401 &&
    Boolean(requestToken || getRefreshToken()) &&
    !options._retry &&
    !ENDPOINTS_WITHOUT_REFRESH.has(endpointPath);

  if (!canAttemptRefresh) {
    throw toApiError(response, data);
  }

  let refreshedToken: string;
  const currentAccessToken = getAccessToken();

  if (requestToken && currentAccessToken && requestToken !== currentAccessToken) {
    refreshedToken = currentAccessToken;
  } else {
    try {
      refreshedToken = await refreshAccessToken();
    } catch {
      throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
    }
  }

  const retryOptions: ApiRequestOptions = {
    ...options,
    _retry: true,
  };
  const retrySessionIdentity = sessionIdentity;
  const retried = await requestJson(endpoint, retryOptions, refreshedToken);

  if (sessionIdentity !== retrySessionIdentity) {
    throw new ApiError("Cette requête appartient à une session qui n’est plus active.", 409);
  }

  if (retried.response.ok) {
    return retried.data as T;
  }

  if (retried.response.status === 401) {
    expireSessionOnce();
  }

  throw toApiError(retried.response, retried.data);
}
