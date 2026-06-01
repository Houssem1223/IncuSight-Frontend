"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Search,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { dashboardNavByRole } from "@/src/lib/dashboard-nav";
import { UserRole } from "@/src/types/auth";
import type { User } from "@/src/types/user";

interface SidebarProps {
  role: UserRole;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

type NavItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
};

const adminNavItems: NavItem[] = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Notifications", href: "/dashboard/admin/notifications", badge: "3", icon: Bell },
  { label: "Startups", href: "/dashboard/admin/startups", badge: "24", icon: Users },
  { label: "Users", href: "/dashboard/admin/users", icon: UserCheck },
  { label: "Programs", href: "/dashboard/admin/program", badge: "5", icon: FolderKanban },
  { label: "Applications", href: "/dashboard/admin/applications", badge: "12", icon: ClipboardList },
  { label: "Evaluators", href: "/dashboard/admin/application-evaluators", icon: Users },
  { label: "Reviews", href: "/dashboard/admin/application-evaluations", icon: ClipboardList },
];

export default function Sidebar({ role, user, isOpen, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const showAdminNav = role === "ADMIN";
  const fallbackItems: NavItem[] = (dashboardNavByRole[role] || []).map((item) => ({
    label: item.label,
    href: item.href,
  }));
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((value) => value?.[0])
    .join("")
    .toUpperCase() || "IN";
  const roleLabel = role === "ADMIN" ? "Administrateur" : role === "EVALUATOR" ? "Evaluateur" : "Startup";

  return (
    <>
      <button
        aria-label="Close sidebar"
        className={`fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-700 bg-slate-800 p-5 text-white transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 text-white">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-lg font-semibold text-white">IncuSight</p>
            <p className="text-xs uppercase tracking-[0.18em] text-orange-300">MEDIANET Incubateur</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-slate-300">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none"
              placeholder="Rechercher..."
              type="text"
            />
          </div>
        </div>

        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Menu principal
        </p>

        <nav className="flex flex-1 flex-col gap-1">
          {(showAdminNav ? adminNavItems : fallbackItems).map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
                onClick={onClose}
              >
                <span className="flex items-center gap-3">
                  {Icon ? (
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : "bg-slate-500"}`} />
                  )}
                  {item.label}
                </span>
                {item.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-700/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-sm font-bold text-white shadow-md">               
                 {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {user.firstName || "Admin"} {user.lastName || ""}
                </p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            <button
            
              aria-label="Se deconnecter"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
              onClick={onLogout}
              title="Se deconnecter"
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}
