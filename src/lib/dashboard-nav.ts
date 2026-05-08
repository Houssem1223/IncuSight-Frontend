import { UserRole } from "@/src/types/auth";

export interface NavItem {
  label: string;
  href: string;
}

export const dashboardNavByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Notifications", href: "/dashboard/admin/notifications" },
    { label: "Liste des Startups", href: "/dashboard/admin/startups" },
    { label: "Liste des Utilisateurs", href: "/dashboard/admin/users" },
    { label: "Liste des Programmes", href: "/dashboard/admin/program" },
    { label: "Liste des Candidatures", href: "/dashboard/admin/applications" },
    { label: "Affectation Evaluateurs", href: "/dashboard/admin/application-evaluators" },
    { label: "Synthese Reviews", href: "/dashboard/admin/application-evaluations" },
  ],
  STARTUP: [
    { label: "Dashboard", href: "/dashboard/startup" },
    { label: "Mes Startups", href: "/dashboard/startup/applications" },
    { label: "Mes Candidatures", href: "/dashboard/startup/candidatures" },
    { label: "Profile", href: "/dashboard/startup/profile" },
  ],
  EVALUATOR: [
    { label: "Dashboard", href: "/dashboard/evaluateur" },
    { label: "Notifications", href: "/dashboard/evaluateur/notifications" },
    { label: "Liste des Reviews", href: "/dashboard/evaluateur/reviews" },
    { label: "Liste des Assignments", href: "/dashboard/evaluateur/assignments" },
  ],
};