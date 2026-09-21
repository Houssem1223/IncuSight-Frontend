"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, UserRound, X, Zap } from "lucide-react";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useStartups } from "@/src/contexts/StartupContext";
import { useDesktopSidebar } from "@/src/hooks/useSidebarPreference";
import Tooltip from "@/src/components/ui/Tooltip";
import { dashboardNavByRole, type NavBadgeKey } from "@/src/lib/dashboard-nav";
import type { UserRole } from "@/src/types/auth";
import type { User } from "@/src/types/user";

interface SidebarProps {
  role: UserRole; user: User; isOpen: boolean; collapsed: boolean;
  onClose: () => void; onLogout: () => void; onToggleCollapsed: () => void;
}

export default function Sidebar({ role, user, isOpen, collapsed, onClose, onLogout, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const desktop = useDesktopSidebar();
  const rail = desktop && collapsed;
  const { unreadCount } = useNotifications();
  const { startups } = useStartups();
  const { programs } = usePrograms();
  const { applications, applicationsTotal } = useApplications();
  const [search, setSearch] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const account = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const focusSearch = useRef(false);
  const badgeCounts: Record<NavBadgeKey, number> = {
    notifications: unreadCount, startups: startups.length, programs: programs.length,
    applications: applicationsTotal ?? applications.length,
  };
  const navItems = dashboardNavByRole[role];
  const initials = [user.firstName, user.lastName].filter(Boolean).map(value => value?.[0]).join("").toUpperCase() || "IN";
  const roleLabel = role === "ADMIN" ? "Administrateur" : role === "EVALUATOR" ? "Évaluateur" : "Startup";
  const profileHref = navItems.find(item => item.href.endsWith("/profile"))!.href;

  useEffect(() => {
    if (!rail && focusSearch.current) { input.current?.focus(); focusSearch.current = false; }
  }, [rail]);
  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: PointerEvent) => {
      if (!account.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAccountOpen(false); avatar.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);
  useEffect(() => {
    if (desktop || !isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>(".app-drawer-close")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button,input') ?? [])
        .filter(node => !node.hasAttribute("disabled") && node.getClientRects().length > 0);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [desktop, isOpen, onClose]);

  return <>
    {!desktop && isOpen && <button className="app-sidebar-overlay" aria-label="Fermer le menu principal" onClick={onClose} tabIndex={-1} />}
    <aside id="dashboard-sidebar" ref={sidebar} className="app-sidebar" data-open={isOpen} data-rail={rail}
      aria-label="Menu principal" role={desktop ? undefined : "dialog"} aria-modal={!desktop && isOpen ? true : undefined}
      inert={!desktop && !isOpen}>
      <div className="app-sidebar-brand">
        <span className="app-brand-icon" aria-label="IncuSight"><Zap size={20} aria-hidden="true" /></span>
        <div className="app-sidebar-label"><strong>IncuSight</strong><small>MEDIANET Incubateur</small></div>
        <div className="app-sidebar-toggle">
          <Tooltip label={rail ? "Déplier le menu" : "Replier le menu"}>
            <button type="button" className="app-collapse-button" aria-label={rail ? "Déplier le menu" : "Replier le menu"}
              aria-expanded={!collapsed} aria-controls="dashboard-navigation" onClick={onToggleCollapsed}>
              {rail ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </Tooltip>
        </div>
        <button className="app-drawer-close app-icon-button" type="button" aria-label="Fermer le menu" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="app-sidebar-search">
        {rail ? <Tooltip label="Rechercher dans le menu"><button type="button" className="app-nav-link" aria-label="Rechercher dans le menu" onClick={() => { focusSearch.current = true; onToggleCollapsed(); }}><Search size={20} /></button></Tooltip>
          : <label><Search size={18} aria-hidden="true" /><input ref={input} aria-label="Rechercher dans le menu" placeholder="Rechercher dans le menu…" value={search} onChange={event => setSearch(event.target.value)} /></label>}
      </div>
      <p className="app-menu-heading app-sidebar-label">Menu principal</p>
      <nav id="dashboard-navigation" aria-label="Navigation du dashboard">
        {navItems.filter(item => rail || item.label.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))).map(item => {
          const Icon = item.icon;
          const count = item.badgeKey ? badgeCounts[item.badgeKey] : item.href.endsWith("/notifications") ? unreadCount : 0;
          return <Tooltip key={item.href} label={item.label} enabled={rail}>
            <Link href={item.href} className="app-nav-link" aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} onClick={onClose}>
              <Icon size={20} aria-hidden="true" /><span className="app-sidebar-label">{item.label}</span>
              {count > 0 && <span className="app-nav-count" aria-label={`${count} éléments`}>{count > 99 ? "99+" : count}</span>}
            </Link>
          </Tooltip>;
        })}
        {!rail && !navItems.some(item => item.label.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr"))) && <p className="app-search-empty">Aucune rubrique trouvée.</p>}
      </nav>
      <div className="app-sidebar-account" ref={account}>
        <Tooltip label={`${user.firstName || "Mon compte"} · ${roleLabel}`} enabled={rail && !accountOpen}>
          <button ref={avatar} type="button" className="app-account-button" aria-label="Ouvrir mon compte" aria-expanded={accountOpen} aria-controls="sidebar-account" onClick={() => setAccountOpen(!accountOpen)}>
            <span className="app-avatar">{initials}</span><span className="app-sidebar-label"><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel}</small></span>
          </button>
        </Tooltip>
        {accountOpen && <div className="app-account-popover" id="sidebar-account" aria-label="Mon compte">
          <p>{user.firstName} {user.lastName}<small>{roleLabel}</small></p>
          <Link href={profileHref} onClick={() => { setAccountOpen(false); onClose(); }}><UserRound size={18} />Mon compte</Link>
          <button type="button" onClick={() => { setAccountOpen(false); onLogout(); }}><LogOut size={18} />Se déconnecter</button>
        </div>}
      </div>
    </aside>
  </>;
}
