"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Search,
  Zap,
} from "lucide-react";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useStartups } from "@/src/contexts/StartupContext";
import { dashboardNavByRole, type NavBadgeKey } from "@/src/lib/dashboard-nav";
import type { UserRole } from "@/src/types/auth";
import type { User } from "@/src/types/user";

interface SidebarProps {
  role: UserRole;
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ role, user, isOpen, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const navItems = dashboardNavByRole[role];
  const { unreadCount } = useNotifications();
  const { startups } = useStartups();
  const { programs } = usePrograms();
  const { applications } = useApplications();

  // Contextes partages avec les pages de gestion admin (voir AdminLayout pour
  // le refresh periodique) : la sidebar ne fait aucun fetch, elle lit l'etat
  // deja charge par ces memes contextes.
  const badgeCounts: Record<NavBadgeKey, number> = {
    notifications: unreadCount,
    startups: startups.length,
    programs: programs.length,
    applications: applications.length,
  };

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
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;

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
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {item.label}
                </span>
                {Boolean(badgeCount) && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-3">
          <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-700/50 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-sm font-bold text-white shadow-md">
                 {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.firstName || "Admin"} {user.lastName || ""}
                </p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            <button
              aria-label="Se deconnecter"
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
              onClick={onLogout}
              title="Se deconnecter"
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
