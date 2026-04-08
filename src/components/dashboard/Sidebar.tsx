"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavByRole } from "@/src/lib/dashboard-nav";
import { UserRole } from "@/src/types/auth";

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const items = dashboardNavByRole[role] || [];

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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/80 bg-surface/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur transition-transform duration-300 md:static md:z-0 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 rounded-2xl border border-brand/20 bg-surface-strong px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-strong">
            Medianet
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">IncuSight</h2>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
                  isActive
                    ? "border-brand/30 bg-brand text-brand-contrast shadow-sm"
                    : "border-transparent text-foreground-muted hover:border-border hover:bg-surface"
                }`}
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
