import assert from "node:assert/strict";
import test from "node:test";

const { ApiError } = await import("../src/lib/api.ts");
const {
  RESEND_RATE_LIMIT_MESSAGE,
  RESEND_VERIFICATION_COOLDOWN_SECONDS,
  getResendVerificationErrorMessage,
} = await import("../src/lib/resend-verification.ts");

test("le délai de renvoi est fixé à 60 secondes", () => {
  assert.equal(RESEND_VERIFICATION_COOLDOWN_SECONDS, 60);
});

test("une erreur 429 affiche le message français demandé", () => {
  assert.equal(
    getResendVerificationErrorMessage(new ApiError("Too many requests", 429)),
    RESEND_RATE_LIMIT_MESSAGE,
  );
  assert.equal(
    RESEND_RATE_LIMIT_MESSAGE,
    "Trop de demandes, veuillez réessayer plus tard",
  );
});

test("les autres erreurs backend conservent leur message", () => {
  assert.equal(
    getResendVerificationErrorMessage(new ApiError("Compte introuvable", 404)),
    "Compte introuvable",
  );
});
