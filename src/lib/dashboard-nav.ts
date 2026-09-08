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

// Cle vers un compteur calcule dynamiquement (contextes React), plutot qu'une
// valeur figee : voir Sidebar.tsx pour le mapping badgeKey -> nombre reel.
export type NavBadgeKey = "notifications" | "startups" | "programs" | "applications";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
}

export const dashboardNavByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    {
      label: "Notifications",
      href: "/dashboard/admin/notifications",
      icon: Bell,
      badgeKey: "notifications",
    },
    { label: "Startups", href: "/dashboard/admin/startups", icon: Users, badgeKey: "startups" },
    { label: "Users", href: "/dashboard/admin/users", icon: UserCheck },
    {
      label: "Programs",
      href: "/dashboard/admin/program",
      icon: FolderKanban,
      badgeKey: "programs",
    },
    {
      label: "Applications",
      href: "/dashboard/admin/applications",
      icon: ClipboardList,
      badgeKey: "applications",
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
