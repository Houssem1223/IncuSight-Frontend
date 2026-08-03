import assert from "node:assert/strict";
import test from "node:test";

const { ApiError } = await import("../src/lib/api.ts");
const {
  EXPIRED_RESET_LINK_MESSAGE,
  FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
  INVALID_RESET_LINK_MESSAGE,
  PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE,
  RESET_PASSWORD_RATE_LIMIT_MESSAGE,
  getForgotPasswordEmailError,
  getForgotPasswordErrorMessage,
  getResetPasswordErrorMessage,
  getResetPasswordValidationError,
  getUtf8ByteLength,
  normalizePasswordRecoveryEmail,
  requestForgotPassword,
  requestResetPassword,
  validateResetPasswordForm,
} = await import("../src/lib/password-recovery.ts");

test("un email valide est normalisé avant l'envoi", async () => {
  const submittedEmail = "  User@Example.COM ";

  assert.equal(normalizePasswordRecoveryEmail(submittedEmail), "user@example.com");
  assert.equal(getForgotPasswordEmailError(submittedEmail), null);

  const response = await requestForgotPassword(submittedEmail, async (endpoint, options) => {
    assert.equal(endpoint, "auth/forgot-password");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      email: "user@example.com",
    });

    return { message: "Si un compte existe, un email a été envoyé." };
  });

  assert.deepEqual(response, {
    message: "Si un compte existe, un email a été envoyé.",
  });
});

test("un email invalide est refusé par la validation", () => {
  assert.notEqual(getForgotPasswordEmailError("user@"), null);
  assert.notEqual(getForgotPasswordEmailError("   "), null);
});

test("Strongpass123! respecte les exigences du reset", () => {
  assert.equal(getResetPasswordValidationError("Strongpass123!"), null);
  assert.deepEqual(
    validateResetPasswordForm({
      newPassword: "Strongpass123!",
      confirmPassword: "Strongpass123!",
    }),
    {},
  );
});

test("chaque exigence de robustesse du mot de passe est contrôlée", () => {
  const weakPasswords = [
    "Aa1!",
    "strongpass123!",
    "STRONGPASS123!",
    "Strongpass!",
    "Strongpass123",
  ];

  for (const password of weakPasswords) {
    assert.notEqual(getResetPasswordValidationError(password), null, password);
  }
});

test("la limite est calculée en octets UTF-8 et non en caractères", () => {
  const passwordAtLimit = `Strongpass123!${"é".repeat(29)}`;
  const passwordOverLimit = `Strongpass123!${"é".repeat(30)}`;

  assert.equal(getUtf8ByteLength(passwordAtLimit), 72);
  assert.equal(getResetPasswordValidationError(passwordAtLimit), null);
  assert.equal(getUtf8ByteLength(passwordOverLimit), 74);
  assert.match(getResetPasswordValidationError(passwordOverLimit) ?? "", /72 octets/i);
});

test("la confirmation doit être identique au nouveau mot de passe", () => {
  const errors = validateResetPasswordForm({
    newPassword: "Strongpass123!",
    confirmPassword: "Differentpass123!",
  });

  assert.equal(errors.newPassword, undefined);
  assert.ok(errors.confirmPassword);
});

test("un token absent est refusé sans appeler le requester", async () => {
  let requestCount = 0;
  const requester = async () => {
    requestCount += 1;
    return { message: "ne doit pas être appelé" };
  };

  for (const token of [undefined, null, "", "   "]) {
    await assert.rejects(
      requestResetPassword(token, "Strongpass123!", requester),
      (error) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === INVALID_RESET_LINK_MESSAGE,
    );
  }

  assert.equal(requestCount, 0);
});

test("le reset envoie exactement le token et le nouveau mot de passe", async () => {
  const token = "reset-token-recu-par-email";

  const response = await requestResetPassword(
    token,
    "Strongpass123!",
    async (endpoint, options) => {
      assert.equal(endpoint, "auth/reset-password");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), {
        token,
        newPassword: "Strongpass123!",
      });

      return { message: "Mot de passe réinitialisé avec succès" };
    },
  );

  assert.deepEqual(response, {
    message: "Mot de passe réinitialisé avec succès",
  });
});

test("les erreurs 400, 429 et réseau sont mappées sans détails techniques", () => {
  assert.equal(
    getResetPasswordErrorMessage(new ApiError("Token expiré", 400)),
    EXPIRED_RESET_LINK_MESSAGE,
  );
  assert.equal(
    getResetPasswordErrorMessage(new ApiError("Too many attempts", 429)),
    RESET_PASSWORD_RATE_LIMIT_MESSAGE,
  );
  assert.equal(
    getForgotPasswordErrorMessage(new ApiError("Too many requests", 429)),
    FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
  );
  assert.equal(
    getResetPasswordErrorMessage(new TypeError("fetch failed: internal host")),
    PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE,
  );
  assert.equal(
    getForgotPasswordErrorMessage(new TypeError("fetch failed: internal host")),
    PASSWORD_RECOVERY_NETWORK_ERROR_MESSAGE,
  );
});
