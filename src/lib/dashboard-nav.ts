import { UserRole } from "@/src/types/auth";

export interface NavItem {
  label: string;
  href: string;
}

export const dashboardNavByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Projects", href: "/dashboard/admin/projects" },
  ],
  STARTUP: [
    { label: "Dashboard", href: "/dashboard/startup" },
    { label: "My Applications", href: "/dashboard/startup/applications" },
    { label: "Profile", href: "/dashboard/startup/profile" },
  ],
  EVALUATOR: [
    { label: "Dashboard", href: "/dashboard/evaluateur" },
    { label: "Reviews", href: "/dashboard/evaluateur/reviews" },
    { label: "Assignments", href: "/dashboard/evaluateur/assignments" },
  ],
};