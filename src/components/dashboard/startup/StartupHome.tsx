"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import StartupIncubationFollowups from "./StartupIncubationFollowups";
import StartupPrograms from "./StartupPrograms";

export default function StartupHome() {
  const { isAuthReady, user } = useAuth();
  const { myFollowUps, fetchMyFollowUps } = useIncubationFollowups();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isAuthReady || user?.role !== "STARTUP") return;
    let active = true;
    fetchMyFollowUps().then(() => { if (active) setState("ready"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [isAuthReady, user?.id, user?.role, fetchMyFollowUps, attempt]);

  return <RoleGuard allowedRole="STARTUP">
    {state === "loading" ? <div aria-label="Chargement de votre espace" className="space-y-4"><div className="h-36 animate-pulse rounded-2xl bg-slate-100" /><div className="h-64 animate-pulse rounded-2xl bg-slate-100" /></div>
      : state === "error" ? <section className="dashboard-surface p-6"><h1 className="text-xl font-semibold">Votre espace startup</h1><p role="alert" className="mt-3 text-red-700">Impossible de vérifier votre incubation pour le moment.</p><button className="dashboard-btn mt-4 rounded-xl border border-border px-4 py-2" onClick={() => { setState("loading"); setAttempt(value => value + 1); }}>Réessayer</button></section>
      : myFollowUps.some(followUp => followUp.status === "ACTIVE") ? <StartupIncubationFollowups dashboard />
      : <div className="space-y-5">
        <section className="dashboard-surface p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong">Votre parcours</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Préparez votre prochaine étape</h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground-muted">Vous n’avez pas d’incubation active. Complétez votre startup, découvrez les programmes ouverts et suivez vos candidatures ci-dessous.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast" href="/dashboard/startup/applications">Gérer mes startups</Link>
            <Link className="dashboard-btn rounded-xl border border-border px-4 py-2 text-sm" href="/dashboard/startup/candidatures">Mes candidatures et décisions</Link>
            {myFollowUps.length > 0 && <Link className="dashboard-btn rounded-xl border border-border px-4 py-2 text-sm" href="/dashboard/startup/incubation-followups">Consulter mes suivis précédents</Link>}
          </div>
        </section>
        <StartupPrograms embedded />
      </div>}
  </RoleGuard>;
}
