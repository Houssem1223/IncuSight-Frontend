"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { getStartupOverview } from "@/src/lib/dashboard-api";

const PHASE_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding",
  DIAGNOSTIC: "Diagnostic",
  BUILD: "Construction",
  MARKET_VALIDATION: "Validation marche",
  PITCH_PREPARATION: "Preparation du pitch",
  CLOSING: "Cloture",
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-700"
        : "text-foreground";

  return (
    <article className="dashboard-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </article>
  );
}

/**
 * Vue d'ensemble de la startup connectee : etat de ses candidatures et de son
 * incubation. L'endpoint backend renvoyait 501 jusqu'ici, la startup n'avait
 * donc aucune vue agregee de son parcours.
 */
export default function StartupDashboardOverview() {
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "startup", "overview"],
    queryFn: () => getStartupOverview(),
    placeholderData: keepPreviousData,
  });

  if (overviewQuery.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" key={index} />
        ))}
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">Impossible de charger votre synthese.</p>
        <Button
          className="mt-3"
          onClick={() => void overviewQuery.refetch()}
          type="button"
          variant="outline"
        >
          Reessayer
        </Button>
      </div>
    );
  }

  const data = overviewQuery.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Candidatures" value={data.candidatures.total} />
        <Tile label="En attente" value={data.candidatures.enAttente} />
        <Tile label="Acceptees" tone="success" value={data.candidatures.acceptees} />
        <Tile label="Non retenues" value={data.candidatures.rejetees} />
      </div>

      {data.profils.brouillons > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data.profils.brouillons} profil{data.profils.brouillons > 1 ? "s" : ""} encore
          en brouillon : un brouillon ne peut pas candidater tant qu&apos;il n&apos;est pas
          publie.{" "}
          <Link
            className="underline underline-offset-2"
            href="/dashboard/startup/applications"
          >
            Completer mon profil
          </Link>
        </p>
      )}

      {data.incubation.length > 0 && (
        <section className="dashboard-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Mon incubation</h2>
            <Link
              className="text-sm text-brand-strong underline underline-offset-2"
              href="/dashboard/startup/incubation-followups"
            >
              Voir le detail
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {data.incubation.map((followUp) => (
              <article className="dashboard-card p-4" key={followUp.followUpId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {followUp.startupName}
                    </p>
                    <p className="truncate text-xs text-foreground-muted">
                      {followUp.programTitle} ·{" "}
                      {PHASE_LABELS[followUp.phase] || followUp.phase}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-brand-strong">
                    {followUp.progress} %
                  </span>
                </div>

                <Progress className="mt-3" value={followUp.progress} />

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-foreground-muted">
                  <span>
                    Objectifs : {followUp.objectifs.termines}/{followUp.objectifs.total}
                  </span>
                  {followUp.objectifs.enRetard > 0 && (
                    <span className="font-medium text-red-700">
                      {followUp.objectifs.enRetard} objectif
                      {followUp.objectifs.enRetard > 1 ? "s" : ""} en retard
                    </span>
                  )}
                  <span className={followUp.pointEnRetard ? "font-medium text-amber-700" : ""}>
                    Dernier point : {formatDate(followUp.dernierPointAt)}
                    {followUp.pointEnRetard ? " (a actualiser)" : ""}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
