"use client";

import { User } from "@/src/types/auth";

interface HeaderProps {
  user: User;
  onLogout: () => Promise<void>;
  onToggleSidebar: () => void;
}

export default function Header({
  user,
  onLogout,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-gradient-to-r from-white/92 via-surface to-orange-50/40 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open sidebar"
            className="dashboard-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm hover:border-brand/50 md:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <span className="font-mono text-lg leading-none">=</span>
          </button>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              IncuSight Dashboard
            </h1>
            <p className="text-sm text-foreground-muted">
              Espace MEDIANET Incubateur - Bienvenue {user.firstName}
            </p>
          </div>
        </div>

        <button
          className="dashboard-btn rounded-xl border border-warning/20 bg-warning px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-95"
          onClick={() => void onLogout()}
          type="button"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
