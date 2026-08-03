import { LANDING_LOGIN_ROUTE } from "./auth-routing";

export function getDashboardRoute(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "STARTUP":
      return "/dashboard/startup";
    case "EVALUATOR":
      return "/dashboard/evaluateur";
    default:
      return LANDING_LOGIN_ROUTE;
  }
}
