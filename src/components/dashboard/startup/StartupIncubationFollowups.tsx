"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, ClipboardList, RefreshCw, Target } from "lucide-react";
import RoleGuard from "@/src/components/auth/Roleguard";
import StartupIncubationFollowupsInteractive from "@/src/components/dashboard/startup/StartupIncubationFollowupsInteractive";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { useAuth } from "@/src/contexts/AuthContext";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import type {
  FollowUpPhase,
  FollowUpStatus,
  IncubationFollowUp,
} from "@/src/types/incubation-followups";

const statusLabels: Record<FollowUpStatus, string> = {
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  SUSPENDED: "Suspendu",
  DROPPED: "Abandonné",
};

const phaseLabels: Record<FollowUpPhase, string> = {
  ONBOARDING: "Intégration",
  DIAGNOSTIC: "Diagnostic",
  BUILD: "Construction",
  MARKET_VALIDATION: "Validation marché",
  PITCH_PREPARATION: "Préparation du pitch",
  CLOSING: "Clôture",
};

function statusClass(status: FollowUpStatus): string {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SUSPENDED" || status === "DROPPED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getReportedProgress(followUp: IncubationFollowUp): number {
  const latestReportedProgress = followUp.updates?.find(
    (update) => typeof update.progress === "number",
  )?.progress;
  const value = latestReportedProgress ?? followUp.progress ?? 0;

  return Math.min(100, Math.max(0, value));
}

export default function StartupIncubationFollowups() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    myFollowUps,
    isFollowUpsLoading,
    followUpsError,
    clearFollowUpsError,
    fetchMyFollowUps,
  } = useIncubationFollowups();
  const [selectedFollowUpId, setSelectedFollowUpId] = useState("");

  const refresh = useCallback(async () => {
    clearFollowUpsError();
    await fetchMyFollowUps();
  }, [clearFollowUpsError, fetchMyFollowUps]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refresh().catch(() => {
    });
  }, [isAuthReady, isAuthenticated, refresh]);

  const sortedFollowUps = useMemo(
    () =>
      [...myFollowUps].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();
        return rightDate - leftDate;
      }),
    [myFollowUps],
  );

  const activeFollowUpId = useMemo(() => {
    if (sortedFollowUps.some((followUp) => followUp.id === selectedFollowUpId)) {
      return selectedFollowUpId;
    }

    return sortedFollowUps[0]?.id || "";
  }, [selectedFollowUpId, sortedFollowUps]);

  const activeFollowUp =
    sortedFollowUps.find((followUp) => followUp.id === activeFollowUpId) || null;

  const summary = useMemo(() => {
    const objectives = myFollowUps.flatMap((followUp) => followUp.objectives || []);

    return {
      active: myFollowUps.filter((followUp) => (followUp.status || "ACTIVE") === "ACTIVE")
        .length,
      objectives: objectives.length,
      completedObjectives: objectives.filter((objective) => objective.status === "DONE").length,
      updates: myFollowUps.reduce(
        (total, followUp) => total + (followUp.updates?.length || 0),
        0,
      ),
    };
  }, [myFollowUps]);

  return (
    <RoleGuard allowedRole="STARTUP">
      <div className="space-y-6">
        <section className="motion-rise dashboard-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
                Espace startup
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Mon suivi d’incubation
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
                Consultez vos objectifs, mettez à jour leur progression et partagez régulièrement
                vos avancées, blocages et besoins avec l’équipe d’incubation.
              </p>
            </div>

            <Button
              disabled={isFollowUpsLoading}
              onClick={() => void refresh().catch(() => {
              })}
              type="button"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isFollowUpsLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Suivis actifs", value: summary.active, icon: Activity },
              { label: "Objectifs", value: summary.objectives, icon: Target },
              {
                label: "Objectifs terminés",
                value: summary.completedObjectives,
                icon: CheckCircle2,
              },
              { label: "Comptes rendus", value: summary.updates, icon: ClipboardList },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article className="dashboard-card p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                    </div>
                    <span className="rounded-xl bg-orange-50 p-2.5 text-brand-strong">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {followUpsError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {followUpsError}
          </p>
        )}

        {isFollowUpsLoading && myFollowUps.length === 0 && (
          <section className="dashboard-surface space-y-3 p-6">
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
          </section>
        )}

        {!isFollowUpsLoading && !followUpsError && sortedFollowUps.length === 0 && (
          <section className="dashboard-surface p-8 text-center">
            <Activity className="mx-auto h-11 w-11 text-brand" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              Aucun suivi d’incubation actif
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-foreground-muted">
              Votre suivi apparaîtra ici après l’acceptation de votre candidature et son
              initialisation par l’administrateur.
            </p>
          </section>
        )}

        {sortedFollowUps.length > 0 && (
          <section className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="dashboard-surface h-fit p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Mes programmes</h2>
                <span className="text-sm text-foreground-muted">{sortedFollowUps.length}</span>
              </div>

              <div className="mt-4 space-y-2">
                {sortedFollowUps.map((followUp) => {
                  const status = followUp.status || "ACTIVE";
                  const phase = followUp.phase || "ONBOARDING";
                  const isActive = followUp.id === activeFollowUpId;
                  const progress = getReportedProgress(followUp);

                  return (
                    <button
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-brand/50 bg-orange-50/80 shadow-sm"
                          : "border-border/70 bg-white/85 hover:border-brand/30"
                      }`}
                      key={followUp.id}
                      onClick={() => setSelectedFollowUpId(followUp.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {followUp.program?.title || followUp.programId}
                          </p>
                          <p className="mt-1 truncate text-xs text-foreground-muted">
                            {phaseLabels[phase]}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(status)}`}
                        >
                          {statusLabels[status]}
                        </span>
                      </div>
                      <Progress
                        className="mt-3"
                        indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
                        value={progress}
                      />
                      <p className="mt-1 text-right text-[11px] text-foreground-muted">
                        {progress} %
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            {activeFollowUp && (
              <StartupIncubationFollowupsInteractive followUp={activeFollowUp} />
            )}
          </section>
        )}
      </div>
    </RoleGuard>
  );
}
