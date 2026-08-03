import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  clear() {
    this.items.clear();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  removeItem(key) {
    this.items.delete(key);
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }
}

if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, init = {}) {
      super(type);
      this.detail = init.detail;
    }
  };
}

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const storage = new MemoryStorage();
const browserWindow = new EventTarget();

globalThis.window = browserWindow;
globalThis.localStorage = storage;

const api = await import("../src/lib/api.ts");

function jsonResponse(status, body) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestPath(url) {
  return new URL(url).pathname;
}

function authorization(options) {
  return new Headers(options?.headers).get("Authorization");
}

function listenForExpiredSessions() {
  let count = 0;
  const listener = (event) => {
    if (event.detail?.reason === "expired") {
      count += 1;
    }
  };
  browserWindow.addEventListener(api.AUTH_SESSION_EXPIRED_EVENT, listener);

  return {
    count: () => count,
    stop: () => browserWindow.removeEventListener(api.AUTH_SESSION_EXPIRED_EVENT, listener),
  };
}

beforeEach(() => {
  storage.clear();
  api.saveSession("old-access", "old-refresh");
});

after(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

test("un 401 sans refresh token nettoie la session sans appeler le refresh", async () => {
  storage.removeItem(api.REFRESH_TOKEN_KEY);
  let fetchCount = 0;
  const expiredEvents = listenForExpiredSessions();
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse(401, { message: "Token expiré" });
  };

  await assert.rejects(api.apiFetch("protected/resource"), (error) => {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, 401);
    return true;
  });

  assert.equal(fetchCount, 1);
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
  assert.equal(expiredEvents.count(), 1);
  expiredEvents.stop();
});

test("refreshAccessToken sans refresh token ne lance aucun appel HTTP", async () => {
  storage.removeItem(api.REFRESH_TOKEN_KEY);
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse(500, null);
  };

  await assert.rejects(api.refreshAccessToken(), api.ApiError);
  assert.equal(fetchCount, 0);
  assert.equal(api.getAccessToken(), null);
});

test("un refresh expiré est essayé une seule fois puis la session est nettoyée", async () => {
  const calls = [];
  const expiredEvents = listenForExpiredSessions();
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (requestPath(url) === "/auth/refresh-token") {
      assert.equal(options.method, "POST");
      assert.equal(options.body, JSON.stringify({ refreshToken: "old-refresh" }));
      assert.equal(authorization(options), null);
      return jsonResponse(401, { message: "Refresh expiré" });
    }
    return jsonResponse(401, { message: "Token expiré" });
  };

  await assert.rejects(api.apiFetch("protected/resource"), api.ApiError);

  assert.equal(calls.length, 2);
  assert.equal(calls.filter(({ url }) => requestPath(url) === "/auth/refresh-token").length, 1);
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
  assert.equal(expiredEvents.count(), 1);
  expiredEvents.stop();
});

test("un refresh réussi sauvegarde les nouveaux JWT et rejoue la requête une fois", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const path = requestPath(url);

    if (path === "/auth/refresh-token") {
      return jsonResponse(200, {
        token: "new-access",
        refreshToken: "new-refresh",
      });
    }

    if (authorization(options) === "Bearer new-access") {
      return jsonResponse(200, { id: "resource-1" });
    }

    return jsonResponse(401, { message: "Token expiré" });
  };

  const result = await api.apiFetch("protected/resource");

  assert.deepEqual(result, { id: "resource-1" });
  assert.equal(calls.length, 3);
  assert.equal(authorization(calls[0].options), "Bearer old-access");
  assert.equal(requestPath(calls[1].url), "/auth/refresh-token");
  assert.equal(authorization(calls[2].options), "Bearer new-access");
  assert.equal(api.getAccessToken(), "new-access");
  assert.equal(api.getRefreshToken(), "new-refresh");
});

test("des 401 concurrents partagent une unique requête de refresh", async () => {
  let refreshCount = 0;
  let protectedCount = 0;
  globalThis.fetch = async (url, options) => {
    if (requestPath(url) === "/auth/refresh-token") {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return jsonResponse(200, {
        token: "shared-access",
        refreshToken: "shared-refresh",
      });
    }

    protectedCount += 1;
    if (authorization(options) === "Bearer shared-access") {
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(401, { message: "Token expiré" });
  };

  const results = await Promise.all([
    api.apiFetch("protected/first"),
    api.apiFetch("protected/second"),
  ]);

  assert.deepEqual(results, [{ ok: true }, { ok: true }]);
  assert.equal(refreshCount, 1);
  assert.equal(protectedCount, 4);
});

test("un 401 tardif réutilise le token déjà renouvelé sans second refresh", async () => {
  let releaseLateResponse;
  const lateResponse = new Promise((resolve) => {
    releaseLateResponse = resolve;
  });
  let refreshCount = 0;

  globalThis.fetch = async (url, options) => {
    const path = requestPath(url);

    if (path === "/auth/refresh-token") {
      refreshCount += 1;
      return jsonResponse(200, {
        token: "fresh-access",
        refreshToken: "fresh-refresh",
      });
    }

    if (authorization(options) === "Bearer fresh-access") {
      return jsonResponse(200, { ok: true });
    }

    if (path === "/protected/late") {
      await lateResponse;
    }

    return jsonResponse(401, { message: "Token expiré" });
  };

  const late = api.apiFetch("protected/late");
  const first = await api.apiFetch("protected/first");
  releaseLateResponse();

  assert.deepEqual(first, { ok: true });
  assert.deepEqual(await late, { ok: true });
  assert.equal(refreshCount, 1);
});

test("les endpoints d'authentification exclus ne déclenchent jamais de refresh", async (t) => {
  const endpoints = [
    "auth/sign-in",
    "auth/refresh-token",
    "auth/logout",
    "users/signup",
    "auth/resend-verification-email",
    "auth/forgot-password",
    "auth/reset-password",
    `auth/verify-email?token=${"e".repeat(64)}`,
  ];

  const endpointsWithoutBearer = new Set([
    "auth/forgot-password",
    "auth/reset-password",
  ]);

  for (const endpoint of endpoints) {
    await t.test(endpoint, async () => {
      api.saveSession("old-access", "old-refresh");
      let fetchCount = 0;
      globalThis.fetch = async (_url, options) => {
        fetchCount += 1;

        if (endpointsWithoutBearer.has(endpoint)) {
          assert.equal(authorization(options), null);
        }

        return jsonResponse(401, { message: "Non autorisé" });
      };

      await assert.rejects(api.apiFetch(endpoint, { method: "POST" }), api.ApiError);
      assert.equal(fetchCount, 1);
    });
  }
});

test("un endpoint public en erreur ne reçoit pas de bearer et ne déclenche pas de refresh", async () => {
  let fetchCount = 0;
  globalThis.fetch = async (_url, options) => {
    fetchCount += 1;
    assert.equal(authorization(options), null);
    return jsonResponse(401, { message: "Indisponible" });
  };

  await assert.rejects(api.apiFetch("program/public"), api.ApiError);
  assert.equal(fetchCount, 1);
});

test("un signup réussi ne sauvegarde aucun JWT", async () => {
  storage.clear();
  let fetchCount = 0;
  globalThis.fetch = async (_url, options) => {
    fetchCount += 1;
    assert.equal(authorization(options), null);
    return jsonResponse(201, {
      message: "Inscription réussie",
      user: { email: "jean@example.com" },
    });
  };

  const response = await api.apiFetch("users/signup", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean@example.com",
      password: "Strongpass123!",
    }),
  });

  assert.equal(fetchCount, 1);
  assert.equal(response.user.email, "jean@example.com");
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
});

test("le renvoi de vérification envoie uniquement l'email sans bearer", async () => {
  let fetchCount = 0;
  globalThis.fetch = async (url, options) => {
    fetchCount += 1;
    assert.equal(requestPath(url), "/auth/resend-verification-email");
    assert.equal(options.method, "POST");
    assert.equal(options.body, JSON.stringify({ email: "jean@example.com" }));
    assert.equal(authorization(options), null);
    return jsonResponse(200, { message: "Email renvoyé" });
  };

  const response = await api.apiFetch("auth/resend-verification-email", {
    method: "POST",
    body: JSON.stringify({ email: "jean@example.com" }),
  });

  assert.deepEqual(response, { message: "Email renvoyé" });
  assert.equal(fetchCount, 1);
});

test("un logout pendant un refresh empêche la session d'être recréée", async () => {
  let releaseRefresh;
  const refreshResponse = new Promise((resolve) => {
    releaseRefresh = resolve;
  });
  globalThis.fetch = async (url) => {
    if (requestPath(url) === "/auth/refresh-token") {
      await refreshResponse;
      return jsonResponse(200, {
        token: "should-not-be-saved",
        refreshToken: "should-not-be-saved",
      });
    }

    return jsonResponse(401, { message: "Token expiré" });
  };

  const pendingRequest = api.apiFetch("protected/resource");
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.clearSession("logout");
  releaseRefresh();

  await assert.rejects(pendingRequest, api.ApiError);
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
});

test("un 401 reçu après un logout volontaire ne transforme pas le logout en expiration", async () => {
  let releaseResponse;
  const protectedResponse = new Promise((resolve) => {
    releaseResponse = resolve;
  });
  let refreshCount = 0;
  const expiredEvents = listenForExpiredSessions();
  globalThis.fetch = async (url) => {
    if (requestPath(url) === "/auth/refresh-token") {
      refreshCount += 1;
    }

    await protectedResponse;
    return jsonResponse(401, { message: "Token expiré" });
  };

  const pendingRequest = api.apiFetch("protected/resource");
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.clearSession("logout");
  releaseResponse();

  await assert.rejects(
    pendingRequest,
    (error) => error instanceof api.ApiError && error.status === 409,
  );
  assert.equal(refreshCount, 0);
  assert.equal(expiredEvents.count(), 0);
  expiredEvents.stop();
});

test("une ancienne requête n'est jamais rejouée sous une nouvelle session", async () => {
  let releaseOldResponse;
  const oldResponse = new Promise((resolve) => {
    releaseOldResponse = resolve;
  });
  let refreshCount = 0;
  let oldRequestCount = 0;

  globalThis.fetch = async (url, options) => {
    const path = requestPath(url);

    if (path === "/auth/refresh-token") {
      refreshCount += 1;
      return jsonResponse(200, {
        token: "session-b-refreshed-access",
        refreshToken: "session-b-refreshed-refresh",
      });
    }

    if (path === "/protected/old") {
      oldRequestCount += 1;
      await oldResponse;
      return jsonResponse(401, { message: "Ancienne session" });
    }

    if (authorization(options) === "Bearer session-b-refreshed-access") {
      return jsonResponse(200, { session: "b" });
    }

    return jsonResponse(401, { message: "Token B expiré" });
  };

  const oldRequest = api.apiFetch("protected/old");
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.clearSession("logout");
  api.saveSession("session-b-access", "session-b-refresh");

  assert.deepEqual(await api.apiFetch("protected/new"), { session: "b" });
  releaseOldResponse();

  await assert.rejects(
    oldRequest,
    (error) => error instanceof api.ApiError && error.status === 409,
  );
  assert.equal(refreshCount, 1);
  assert.equal(oldRequestCount, 1);
  assert.equal(api.getAccessToken(), "session-b-refreshed-access");
});

test("une requête anonyme tardive n'est pas rejouée après une connexion", async () => {
  storage.clear();
  let releaseAnonymousResponse;
  const anonymousResponse = new Promise((resolve) => {
    releaseAnonymousResponse = resolve;
  });
  let fetchCount = 0;
  let refreshCount = 0;

  globalThis.fetch = async (url) => {
    fetchCount += 1;

    if (requestPath(url) === "/auth/refresh-token") {
      refreshCount += 1;
      return jsonResponse(200, {
        token: "connected-access-refreshed",
        refreshToken: "connected-refresh-refreshed",
      });
    }

    await anonymousResponse;
    return jsonResponse(401, { message: "Connexion requise" });
  };

  const anonymousRequest = api.apiFetch("protected/anonymous");
  await new Promise((resolve) => setTimeout(resolve, 0));
  api.saveSession("connected-access", "connected-refresh");
  releaseAnonymousResponse();

  await assert.rejects(
    anonymousRequest,
    (error) => error instanceof api.ApiError && error.status === 409,
  );
  assert.equal(fetchCount, 1);
  assert.equal(refreshCount, 0);
  assert.equal(api.getAccessToken(), "connected-access");
});

test("un second 401 après refresh ne boucle pas et nettoie la session", async () => {
  let fetchCount = 0;
  let refreshCount = 0;
  const expiredEvents = listenForExpiredSessions();
  globalThis.fetch = async (url) => {
    fetchCount += 1;
    if (requestPath(url) === "/auth/refresh-token") {
      refreshCount += 1;
      return jsonResponse(200, {
        token: "rejected-access",
        refreshToken: "rotated-refresh",
      });
    }
    return jsonResponse(401, { message: "Toujours non autorisé" });
  };

  await assert.rejects(api.apiFetch("protected/resource"), (error) => {
    assert.ok(error instanceof api.ApiError);
    assert.equal(error.status, 401);
    return true;
  });

  assert.equal(fetchCount, 3);
  assert.equal(refreshCount, 1);
  assert.equal(api.getAccessToken(), null);
  assert.equal(api.getRefreshToken(), null);
  assert.equal(expiredEvents.count(), 1);
  expiredEvents.stop();
});
