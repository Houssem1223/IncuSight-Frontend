const API_URL = process.env.NEXT_PUBLIC_API_URL;

const REFRESH_ENDPOINTS = [
  "auth/refresh-token",
  "auth/refresh",
  "auth/refreshToken",
  "auth/token/refresh",
] as const;

export const AUTH_TOKEN_UPDATED_EVENT = "incusight:auth-token-updated";
export const AUTH_SESSION_EXPIRED_EVENT = "incusight:auth-session-expired";

type RefreshResult = {
  token: string;
  refreshToken?: string;
};

let refreshPromise: Promise<RefreshResult | null> | null = null;

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function extractErrorMessage(data: unknown): string | null {
  if (typeof data === "string") {
    return data;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const unknownRecord = data as Record<string, unknown>;
  const message = unknownRecord.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }

  return null;
}

function isRefreshEndpoint(endpoint: string): boolean {
  return REFRESH_ENDPOINTS.some((refreshEndpoint) => endpoint.startsWith(refreshEndpoint));
}

function emitTokenUpdated(result: RefreshResult) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_UPDATED_EVENT, {
      detail: result,
    }),
  );
}

function emitSessionExpired() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

function saveTokens(result: RefreshResult) {
  if (!canUseBrowserStorage()) {
    return;
  }

  localStorage.setItem("token", result.token);

  if (result.refreshToken) {
    localStorage.setItem("refreshToken", result.refreshToken);
  }
}

function clearStoredSession() {
  if (!canUseBrowserStorage()) {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}

function extractRefreshResult(data: unknown): RefreshResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const recordsToInspect: Array<Record<string, unknown>> = [data as Record<string, unknown>];
  const dataField = (data as Record<string, unknown>).data;

  if (dataField && typeof dataField === "object") {
    recordsToInspect.push(dataField as Record<string, unknown>);
  }

  for (const record of recordsToInspect) {
    const tokenValue = record.token ?? record.accessToken;
    const refreshTokenValue = record.refreshToken ?? record.refresh_token;

    if (typeof tokenValue === "string" && tokenValue) {
      return {
        token: tokenValue,
        refreshToken: typeof refreshTokenValue === "string" ? refreshTokenValue : undefined,
      };
    }
  }

  return null;
}

async function requestJson(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  return { response, data };
}

async function tryRefreshOnEndpoint(endpoint: string, refreshToken: string): Promise<RefreshResult | null> {
  const strategies: RequestInit[] = [
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    {
      method: "POST",
      body: JSON.stringify({ token: refreshToken }),
    },
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  ];

  for (const strategy of strategies) {
    const { response, data } = await requestJson(endpoint, strategy);

    if (!response.ok) {
      continue;
    }

    const result = extractRefreshResult(data);

    if (result) {
      return result;
    }
  }

  return null;
}

async function refreshAccessToken(): Promise<RefreshResult | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (!canUseBrowserStorage()) {
    return null;
  }

  const storedRefreshToken = localStorage.getItem("refreshToken");

  if (!storedRefreshToken) {
    clearStoredSession();
    emitSessionExpired();
    return null;
  }

  refreshPromise = (async () => {
    for (const endpoint of REFRESH_ENDPOINTS) {
      try {
        const result = await tryRefreshOnEndpoint(endpoint, storedRefreshToken);

        if (result) {
          saveTokens(result);
          emitTokenUpdated(result);
          return result;
        }
      } catch {
      }
    }

    clearStoredSession();
    emitSessionExpired();
    return null;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const { response, data } = await requestJson(endpoint, options, token);

  if (response.ok) {
    return data as T;
  }

  const isUnauthorized = response.status === 401;
  const canAttemptRefresh = Boolean(token) && !isRefreshEndpoint(endpoint);

  if (isUnauthorized && canAttemptRefresh) {
    const refreshed = await refreshAccessToken();

    if (refreshed?.token) {
      const retried = await requestJson(endpoint, options, refreshed.token);

      if (retried.response.ok) {
        return retried.data as T;
      }

      throw new Error(extractErrorMessage(retried.data) || "Request failed");
    }
  }

  throw new Error(extractErrorMessage(data) || "Request failed");
}