"use client";

import { useEffect } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import AccountSettings from "@/src/components/dashboard/account/AccountSettings";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";
import { useBusinessRules } from "@/src/hooks/useBusinessRules";

export default function StartupProfilePage() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { myStartups, fetchMyStartups } = useStartups();
  const { MAX_STARTUPS_PER_USER } = useBusinessRules();
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
      <div className="space-y-4">
        <AccountSettings />

        <section className="motion-rise dashboard-surface p-6">
          <h2 className="text-base font-semibold text-foreground">Mes profils startup</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Les profils rattaches a ce compte. Ils se gerent depuis « Mes Startups ».
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="dashboard-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Profil principal</h3>
              <p className="mt-2 text-sm text-foreground-muted">
                {primaryStartup?.startupName || "Aucun profil startup enregistre"}
              </p>
            </article>

            <article className="dashboard-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Portefeuille</h3>
              <p className="mt-2 text-sm text-foreground-muted">
                Profils enregistres : {myStartups.length}/{MAX_STARTUPS_PER_USER}
              </p>
              <p className="text-sm text-foreground-muted">
                {previewNames || "Aucun nom de startup disponible pour le moment."}
              </p>
            </article>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}
