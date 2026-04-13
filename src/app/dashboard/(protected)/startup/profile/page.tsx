"use client";

import { useEffect } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";

export default function StartupProfilePage() {
  const { user, isAuthReady, isAuthenticated } = useAuth();
  const { myStartups, fetchMyStartups } = useStartups();
  const primaryStartup = myStartups[0] ?? null;
  const previewNames = myStartups.slice(0, 3).map((startup) => startup.startupName).join(", ");

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void fetchMyStartups();
  }, [isAuthReady, isAuthenticated, fetchMyStartups]);

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Startup Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Account Summary
        </h1>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="dashboard-card p-4">
            <h2 className="text-sm font-semibold text-foreground">User</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {user?.firstName || "-"} {user?.lastName || ""}
            </p>
            <p className="text-sm text-foreground-muted">{user?.email || "-"}</p>
          </article>

          <article className="dashboard-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Startup Portfolio</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {primaryStartup?.startupName || "No startup submitted"}
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Submitted startups: {myStartups.length}/5
            </p>
            <p className="text-sm text-foreground-muted">
              {previewNames || "No startup names available yet."}
            </p>
          </article>
        </div>
      </section>
    </RoleGuard>
  );
}
