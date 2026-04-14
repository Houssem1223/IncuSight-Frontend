"use client";

import { useEffect, useMemo } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(status?: string) {
  return (status || "PENDING").toUpperCase();
}

function getStatusClass(status: string) {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function StartupCandidaturesList() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { myStartups, fetchMyStartups } = useStartups();
  const {
    myApplications,
    isApplicationsLoading,
    applicationsError,
    clearApplicationsError,
    fetchMyApplications,
  } = useApplications();

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    clearApplicationsError();
    void Promise.all([fetchMyStartups(), fetchMyApplications()]).catch(() => {
    });
  }, [
    isAuthReady,
    isAuthenticated,
    clearApplicationsError,
    fetchMyStartups,
    fetchMyApplications,
  ]);

  const startupNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const startup of myStartups) {
      map.set(startup.id, startup.startupName);
    }

    return map;
  }, [myStartups]);

  const myStartupIds = useMemo(() => new Set(myStartups.map((startup) => startup.id)), [myStartups]);

  const myApplicationsForMyStartups = useMemo(
    () =>
      myApplications
        .filter((application) => myStartupIds.has(application.startupId))
        .sort((left, right) => {
          const leftDate = new Date(left.createdAt || 0).getTime();
          const rightDate = new Date(right.createdAt || 0).getTime();

          return rightDate - leftDate;
        }),
    [myApplications, myStartupIds],
  );

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
          Startup Space
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          My Candidatures
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Liste de vos candidatures liees a vos startups.
        </p>

        <article className="dashboard-soft-block mt-6 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Mes candidatures</h2>
            <p className="text-sm text-foreground-muted">Total: {myApplicationsForMyStartups.length}</p>
          </div>

          {isApplicationsLoading && (
            <div className="mt-4 space-y-2">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          )}

          {!isApplicationsLoading && applicationsError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {applicationsError}
            </p>
          )}

          {!isApplicationsLoading && !applicationsError && myApplicationsForMyStartups.length === 0 && (
            <p className="mt-4 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
              Aucune candidature pour le moment.
            </p>
          )}

          {!isApplicationsLoading && !applicationsError && myApplicationsForMyStartups.length > 0 && (
            <div className="mt-4 grid gap-3">
              {myApplicationsForMyStartups.map((application) => {
                const status = normalizeStatus(application.status);

                return (
                  <article className="dashboard-card p-4" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {application.program?.title || application.programId}
                        </h3>
                        <p className="mt-1 text-sm text-foreground-muted">
                          Startup: {startupNameById.get(application.startupId) || application.startupId}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          Cree le: {formatDate(application.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-foreground-muted">
                      {application.motivationLetter || "Aucune lettre de motivation."}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </RoleGuard>
  );
}
