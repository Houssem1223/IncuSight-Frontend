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
    <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/80 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open sidebar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:border-brand/50 md:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <span className="font-mono text-lg leading-none">=</span>
          </button>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Dashboard
            </h1>
            <p className="text-sm text-foreground-muted">Bienvenue {user.email}</p>
          </div>
        </div>

        <button
          className="rounded-xl border border-warning/20 bg-warning px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-95"
          onClick={() => void onLogout()}
          type="button"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
