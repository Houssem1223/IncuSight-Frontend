import assert from "node:assert/strict";
import test from "node:test";

const {
  SIGNUP_SUCCESS_TITLE,
  getSignupSuccessState,
} = await import("../src/lib/signup.ts");

test("le succès du signup prépare le panneau invitant à consulter son email", () => {
  const state = getSignupSuccessState(
    {
      message: "Inscription réussie. Consultez votre email pour vérifier votre compte.",
      user: { email: "jean@example.com" },
    },
    "autre@example.com",
  );

  assert.equal(SIGNUP_SUCCESS_TITLE, "Consultez votre boîte email");
  assert.deepEqual(state, {
    email: "jean@example.com",
    message: "Inscription réussie. Consultez votre email pour vérifier votre compte.",
  });
});

test("le panneau utilise l'email soumis si la réponse ne le répète pas", () => {
  const state = getSignupSuccessState({}, "  Jean@Example.COM ");

  assert.equal(state.email, "jean@example.com");
  assert.match(state.message, /Consultez votre email/i);
});
