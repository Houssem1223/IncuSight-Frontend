import assert from "node:assert/strict";
import test from "node:test";

const {
  EXPIRED_SESSION_LOGIN_ROUTE,
  LANDING_LOGIN_ROUTE,
  LANDING_SIGNUP_ROUTE,
  getLandingAuthMode,
  getSessionRedirectDecision,
} = await import("../src/lib/auth-routing.ts");

test("les routes login et signup ciblent le panneau auth du landing", () => {
  assert.equal(LANDING_LOGIN_ROUTE, "/?auth=login#landing-login");
  assert.equal(LANDING_SIGNUP_ROUTE, "/?auth=signup#landing-login");
  assert.equal(getLandingAuthMode("signup"), "signup");
  assert.equal(getLandingAuthMode("login"), "login");
  assert.equal(getLandingAuthMode(["signup"]), "login");
});

test("une expiration produit une seule redirection jusqu'à la prochaine session", () => {
  const firstExpiration = getSessionRedirectDecision(true, false);
  assert.deepEqual(firstExpiration, {
    hasRedirected: true,
    target: EXPIRED_SESSION_LOGIN_ROUTE,
  });

  assert.deepEqual(
    getSessionRedirectDecision(true, firstExpiration.hasRedirected),
    { hasRedirected: true, target: null },
  );

  const reset = getSessionRedirectDecision(false, true);
  assert.deepEqual(reset, { hasRedirected: false, target: null });
  assert.equal(
    getSessionRedirectDecision(true, reset.hasRedirected).target,
    EXPIRED_SESSION_LOGIN_ROUTE,
  );
});
