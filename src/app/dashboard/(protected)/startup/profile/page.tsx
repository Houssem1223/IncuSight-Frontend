"use client";

import { useEffect } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";

export default function StartupProfilePage() {
  const { user, isAuthReady, isAuthenticated } = useAuth();
  const { myStartup, fetchMyStartup } = useStartups();

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void fetchMyStartup();
  }, [isAuthReady, isAuthenticated, fetchMyStartup]);

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise rounded-2xl border border-border/75 bg-white/90 p-6 shadow-[var(--shadow-soft)]">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Startup Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Account Summary
        </h1>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <h2 className="text-sm font-semibold text-foreground">User</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {user?.firstName || "-"} {user?.lastName || ""}
            </p>
            <p className="text-sm text-foreground-muted">{user?.email || "-"}</p>
          </article>

          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <h2 className="text-sm font-semibold text-foreground">Current Startup</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {myStartup?.startupName || "No startup submitted"}
            </p>
            <p className="text-sm text-foreground-muted">
              Status: {(typeof myStartup?.status === "string" && myStartup.status) || "PENDING"}
            </p>
          </article>
        </div>
      </section>
    </RoleGuard>
  );
}
