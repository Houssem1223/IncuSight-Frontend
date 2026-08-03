export type LandingAuthMode = "login" | "signup";

export const LANDING_LOGIN_ROUTE = "/?auth=login#landing-login";
export const LANDING_SIGNUP_ROUTE = "/?auth=signup#landing-login";
export const EXPIRED_SESSION_LOGIN_ROUTE =
  "/?auth=login&sessionExpired=1#landing-login";

export function getLandingAuthMode(value: unknown): LandingAuthMode {
  return value === "signup" ? "signup" : "login";
}

export type SessionRedirectDecision = {
  hasRedirected: boolean;
  target: string | null;
};

export function getSessionRedirectDecision(
  sessionExpired: boolean,
  hasRedirected: boolean,
): SessionRedirectDecision {
  if (!sessionExpired) {
    return { hasRedirected: false, target: null };
  }

  if (hasRedirected) {
    return { hasRedirected: true, target: null };
  }

  return {
    hasRedirected: true,
    target: EXPIRED_SESSION_LOGIN_ROUTE,
  };
}
