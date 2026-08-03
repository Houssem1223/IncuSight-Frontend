import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  UserCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/src/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const dashboardNavByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    {
      label: "Notifications",
      href: "/dashboard/admin/notifications",
      icon: Bell,
      badge: "3",
    },
    { label: "Startups", href: "/dashboard/admin/startups", icon: Users, badge: "24" },
    { label: "Users", href: "/dashboard/admin/users", icon: UserCheck },
    {
      label: "Programs",
      href: "/dashboard/admin/program",
      icon: FolderKanban,
      badge: "5",
    },
    {
      label: "Applications",
      href: "/dashboard/admin/applications",
      icon: ClipboardList,
      badge: "12",
    },
    {
      label: "Evaluators",
      href: "/dashboard/admin/application-evaluators",
      icon: Users,
    },
    {
      label: "Reviews",
      href: "/dashboard/admin/application-evaluations",
      icon: ClipboardList,
    },
    {
      label: "Suivi incubation",
      href: "/dashboard/admin/incubation-followups",
      icon: Activity,
    },
  ],
  STARTUP: [
    { label: "Dashboard", href: "/dashboard/startup", icon: LayoutDashboard },
    { label: "Notifications", href: "/dashboard/startup/notifications", icon: Bell },
    { label: "Mes Startups", href: "/dashboard/startup/applications", icon: Building2 },
    { label: "Mes Candidatures", href: "/dashboard/startup/candidatures", icon: FileText },
    {
      label: "Suivi incubation",
      href: "/dashboard/startup/incubation-followups",
      icon: Activity,
    },
    { label: "Profile", href: "/dashboard/startup/profile", icon: UserCircle },
  ],
  EVALUATOR: [
    { label: "Dashboard", href: "/dashboard/evaluateur", icon: LayoutDashboard },
    { label: "Notifications", href: "/dashboard/evaluateur/notifications", icon: Bell },
    { label: "Liste des Reviews", href: "/dashboard/evaluateur/reviews", icon: ClipboardCheck },
    {
      label: "Liste des Assignments",
      href: "/dashboard/evaluateur/assignments",
      icon: ListChecks,
    },
  ],
};
