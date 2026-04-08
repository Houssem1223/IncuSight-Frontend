export function getDashboardRoute(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "STARTUP":
      return "/dashboard/startup";
    case "EVALUATOR":
      return "/dashboard/evaluateur";
    default:
      return "/login";
  }
}