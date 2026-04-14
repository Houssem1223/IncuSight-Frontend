import { UserRole } from "@/src/types/auth";

export interface NavItem {
  label: string;
  href: string;
}

export const dashboardNavByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Startups", href: "/dashboard/admin/startups" },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Program", href: "/dashboard/admin/program" },
    { label: "Applications", href: "/dashboard/admin/applications" },
  ],
  STARTUP: [
    { label: "Dashboard", href: "/dashboard/startup" },
    { label: "My Startups", href: "/dashboard/startup/applications" },
    { label: "My Candidatures", href: "/dashboard/startup/candidatures" },
    { label: "Profile", href: "/dashboard/startup/profile" },
  ],
  EVALUATOR: [
    { label: "Dashboard", href: "/dashboard/evaluateur" },
    { label: "Reviews", href: "/dashboard/evaluateur/reviews" },
    { label: "Assignments", href: "/dashboard/evaluateur/assignments" },
  ],
};