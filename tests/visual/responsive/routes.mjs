// Toutes les fenetres de l'application, par role. `ready` est l'expression qui
// indique que le contenu metier est rendu (pas seulement le squelette).
const DASH = "document.querySelector('.app-sidebar') && !document.querySelector('[aria-busy=\"true\"] .animate-pulse')";

export const sessions = {
  public: null,
  admin: "tok-admin",
  evaluator: "tok-evaluator",
  startup: "tok-startup",
  startupNew: "tok-startup-new",
};

export const routes = [
  { session: "public", path: "/", name: "landing", ready: "document.querySelector('header')" },
  { session: "public", path: "/?auth=login#landing-login", name: "login", ready: "document.querySelector('input[type=email]')" },
  { session: "public", path: "/?auth=signup#landing-login", name: "signup", ready: "document.querySelector('input[type=email]')" },
  { session: "public", path: "/?auth=login&sessionExpired=1#landing-login", name: "session-expired", ready: "document.querySelector('input[type=email]')" },
  { session: "public", path: "/startups", name: "showcase", ready: "document.querySelector('h1')" },
  { session: "public", path: "/forgot-password", name: "forgot-password", ready: "document.querySelector('form')" },
  { session: "public", path: "/reset-password?token=demo-token", name: "reset-password", ready: "document.querySelector('form')" },
  { session: "public", path: "/verify-email?token=demo-token", name: "verify-email", ready: "document.querySelector('main')" },
  { session: "public", path: "/offline", name: "offline", ready: "document.querySelector('h1')" },

  { session: "admin", path: "/dashboard/admin", name: "admin-dashboard", ready: DASH },
  { session: "admin", path: "/dashboard/admin/notifications", name: "admin-notifications", ready: DASH },
  { session: "admin", path: "/dashboard/admin/startups", name: "admin-startups", ready: DASH },
  { session: "admin", path: "/dashboard/admin/users", name: "admin-users", ready: DASH },
  { session: "admin", path: "/dashboard/admin/program", name: "admin-programs", ready: DASH },
  { session: "admin", path: "/dashboard/admin/applications", name: "admin-applications", ready: DASH },
  { session: "admin", path: "/dashboard/admin/applications?view=kanban", name: "admin-applications-kanban", ready: DASH },
  { session: "admin", path: "/dashboard/admin/application-evaluators", name: "admin-evaluators", ready: DASH },
  { session: "admin", path: "/dashboard/admin/application-evaluations", name: "admin-evaluations", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups", name: "admin-incubation-list", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=overview", name: "admin-incubation-overview", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=objectives", name: "admin-incubation-objectives", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=journal", name: "admin-incubation-journal", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=vigilance", name: "admin-incubation-vigilance", ready: DASH },
  { session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=notes", name: "admin-incubation-notes", ready: DASH },
  { session: "admin", path: "/dashboard/admin/profile", name: "admin-profile", ready: DASH },

  { session: "evaluator", path: "/dashboard/evaluateur", name: "evaluator-dashboard", ready: DASH },
  { session: "evaluator", path: "/dashboard/evaluateur/assignments", name: "evaluator-assignments", ready: DASH },
  { session: "evaluator", path: "/dashboard/evaluateur/reviews", name: "evaluator-reviews", ready: DASH },
  { session: "evaluator", path: "/dashboard/evaluateur/notifications", name: "evaluator-notifications", ready: DASH },
  { session: "evaluator", path: "/dashboard/evaluateur/profile", name: "evaluator-profile", ready: DASH },

  { session: "startup", path: "/dashboard/startup", name: "startup-dashboard-incubation", ready: DASH },
  { session: "startupNew", path: "/dashboard/startup", name: "startup-dashboard-new", ready: DASH },
  { session: "startup", path: "/dashboard/startup/programs", name: "startup-programs", ready: DASH },
  { session: "startupNew", path: "/dashboard/startup/programs", name: "startup-new-programs", ready: DASH },
  { session: "startup", path: "/dashboard/startup/candidatures", name: "startup-candidatures", ready: DASH },
  { session: "startup", path: "/dashboard/startup/applications", name: "startup-my-startups", ready: DASH },
  { session: "startup", path: "/dashboard/startup/incubation-followups", name: "startup-incubation", ready: DASH },
  { session: "startup", path: "/dashboard/startup/notifications", name: "startup-notifications", ready: DASH },
  { session: "startup", path: "/dashboard/startup/profile", name: "startup-profile", ready: DASH },
];

export const mobileViewports = [[320, 568], [360, 800], [375, 812], [390, 844], [412, 915], [430, 932]];
export const otherViewports = [[768, 1024], [1280, 720], [1440, 900]];
export const screenshotWidths = new Set([320, 360, 390, 768, 1440]);
