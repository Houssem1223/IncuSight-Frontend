import assert from "node:assert/strict";
import test from "node:test";

const {
  getPasswordValidationError,
  isValidEmail,
  isVerificationTokenValid,
  validateSignupForm,
} = await import("../src/lib/auth-validation.ts");

const validSignup = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "IncuSight!2026",
  confirmPassword: "IncuSight!2026",
};

test("la validation signup accepte un formulaire valide", () => {
  assert.deepEqual(validateSignupForm(validSignup), {});
  assert.equal(isValidEmail(`  ${validSignup.email}  `), true);
  assert.equal(getPasswordValidationError(validSignup.password), null);
});

test("la validation signup signale les champs requis et un email invalide", () => {
  const errors = validateSignupForm({
    firstName: " ",
    lastName: "",
    email: "email-invalide",
    password: "",
    confirmPassword: "",
  });

  assert.ok(errors.firstName);
  assert.ok(errors.lastName);
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.confirmPassword);
});

test("le mot de passe doit respecter chaque exigence de robustesse", () => {
  const invalidPasswords = [
    "Aa1!",
    `${"A".repeat(126)}a1!`,
    "minuscules1!",
    "MAJUSCULES1!",
    "SansChiffre!",
    "SansSymbole1",
    "AvecEspace1 ",
  ];

  for (const password of invalidPasswords) {
    assert.notEqual(getPasswordValidationError(password), null, password);
  }
});

test("la confirmation doit correspondre au mot de passe", () => {
  const errors = validateSignupForm({
    ...validSignup,
    confirmPassword: "AutreMotDePasse!2026",
  });

  assert.ok(errors.confirmPassword);
  assert.equal(errors.password, undefined);
});

test("un token de vérification est exactement une chaîne hexadécimale de 64 caractères", () => {
  assert.equal(isVerificationTokenValid("a".repeat(64)), true);
  assert.equal(isVerificationTokenValid("A1".repeat(32)), true);
  assert.equal(isVerificationTokenValid(undefined), false);
  assert.equal(isVerificationTokenValid("a".repeat(63)), false);
  assert.equal(isVerificationTokenValid(`${"a".repeat(63)}z`), false);
});
