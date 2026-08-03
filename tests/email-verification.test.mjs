import assert from "node:assert/strict";
import test from "node:test";

const { ApiError } = await import("../src/lib/api.ts");
const {
  classifyVerificationError,
  getInitialVerificationState,
  verifyEmailOnce,
} = await import("../src/lib/email-verification.ts");

const token = (character) => character.repeat(64);

test("un token absent ou mal formé affiche immédiatement l'état invalide", async () => {
  assert.equal(getInitialVerificationState(), "invalid");
  assert.equal(getInitialVerificationState("pas-un-token"), "invalid");

  let requestCount = 0;
  await assert.rejects(
    verifyEmailOnce("pas-un-token", async () => {
      requestCount += 1;
      return { message: "ne doit pas être appelé" };
    }),
    (error) => error instanceof ApiError && error.status === 400,
  );
  assert.equal(requestCount, 0);
});

test("un token valide démarre en chargement puis peut être confirmé", async () => {
  const validToken = token("a");
  assert.equal(getInitialVerificationState(validToken), "loading");

  const response = await verifyEmailOnce(validToken, async (endpoint) => {
    assert.equal(endpoint, `auth/verify-email?token=${validToken}`);
    return { message: "Email vérifié" };
  });

  assert.deepEqual(response, { message: "Email vérifié" });
});

test("un lien expiré est classé comme invalide", async () => {
  const expiredToken = token("b");

  await assert.rejects(
    verifyEmailOnce(expiredToken, async () => {
      throw new ApiError("Lien expiré", 410);
    }),
    (error) => {
      assert.equal(classifyVerificationError(error), "invalid");
      return true;
    },
  );
});

test("un jeton déjà utilisé signalé en conflit est classé comme invalide", () => {
  assert.equal(classifyVerificationError(new ApiError("Jeton déjà utilisé", 409)), "invalid");
});

test("une panne réseau est distinguée d'un token invalide", async () => {
  const networkToken = token("c");

  await assert.rejects(
    verifyEmailOnce(networkToken, async () => {
      throw new TypeError("fetch failed");
    }),
    (error) => {
      assert.equal(classifyVerificationError(error), "network");
      return true;
    },
  );

  assert.equal(
    classifyVerificationError(new ApiError("Cannot GET /auth/verify-email", 404)),
    "network",
  );
});

test("deux vérifications simultanées du même token partagent une seule requête", async () => {
  const sharedToken = token("d");
  let requestCount = 0;
  let resolveRequest;
  const deferred = new Promise((resolve) => {
    resolveRequest = resolve;
  });
  const requester = async (endpoint) => {
    requestCount += 1;
    assert.equal(endpoint, `auth/verify-email?token=${sharedToken}`);
    return deferred;
  };

  const first = verifyEmailOnce(sharedToken, requester);
  const second = verifyEmailOnce(sharedToken, requester);

  assert.equal(first, second);
  assert.equal(requestCount, 1);

  resolveRequest({ message: "Email vérifié une seule fois" });
  assert.deepEqual(await Promise.all([first, second]), [
    { message: "Email vérifié une seule fois" },
    { message: "Email vérifié une seule fois" },
  ]);
});
