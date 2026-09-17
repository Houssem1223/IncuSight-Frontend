"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import RoleGuard from "@/src/components/auth/Roleguard";
import { Button } from "@/src/components/ui/button";
import { getEvaluatorOverview } from "@/src/lib/dashboard-api";

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-foreground";

  return (
    <article className="dashboard-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-foreground-muted">{hint}</p>}
    </article>
  );
}

/**
 * Vue d'ensemble de l'evaluateur. Jusqu'ici, /dashboard/evaluateur rendait
 * exactement le meme composant que /dashboard/evaluateur/assignments : deux
 * entrees de navigation, une seule page. L'endpoint backend renvoyait 501.
 */
export default function EvaluatorDashboardOverview() {
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "evaluator", "overview"],
    queryFn: () => getEvaluatorOverview(),
    placeholderData: keepPreviousData,
  });

  return (
    <RoleGuard allowedRole="EVALUATOR">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
          Espace evaluateur
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Ma charge d&apos;evaluation
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Ce qui vous est confie, ce qui reste a rendre, et vos prochaines echeances.
        </p>

        {overviewQuery.isPending && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div className="h-28 animate-pulse rounded-xl bg-slate-100" key={index} />
            ))}
          </div>
        )}

        {overviewQuery.isError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Impossible de charger votre tableau de bord.
            </p>
            <Button
              className="mt-3"
              onClick={() => void overviewQuery.refetch()}
              type="button"
              variant="outline"
            >
              Reessayer
            </Button>
          </div>
        )}

        {overviewQuery.data && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile
                hint="Toutes candidatures confondues"
                label="Assignees"
                value={overviewQuery.data.charge.assignees}
              />
              <KpiTile
                hint="Pas encore ouvertes"
                label="A demarrer"
                tone={overviewQuery.data.charge.aDemarrer > 0 ? "warning" : "neutral"}
                value={overviewQuery.data.charge.aDemarrer}
              />
              <KpiTile
                hint="Brouillon commence"
                label="En cours"
                value={overviewQuery.data.charge.enCours}
              />
              <KpiTile
                hint="Echeance depassee"
                label="En retard"
                tone={overviewQuery.data.charge.enRetard > 0 ? "danger" : "neutral"}
                value={overviewQuery.data.charge.enRetard}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <KpiTile
                hint="Sur la periode"
                label="Evaluations soumises"
                value={overviewQuery.data.production.soumises.current}
              />
              <KpiTile
                hint="Moyenne de vos notes, echelle 1-5"
                label="Score moyen donne"
                value={overviewQuery.data.production.scoreMoyenDonne || "-"}
              />
              <article className="dashboard-card p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
                  Vos recommandations
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-foreground-muted">Favorable</dt>
                    <dd className="font-semibold tabular-nums text-emerald-700">
                      {overviewQuery.data.production.recommandations.FAVORABLE}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground-muted">Reserve</dt>
                    <dd className="font-semibold tabular-nums text-amber-700">
                      {overviewQuery.data.production.recommandations.RESERVED}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground-muted">Defavorable</dt>
                    <dd className="font-semibold tabular-nums text-red-700">
                      {overviewQuery.data.production.recommandations.UNFAVORABLE}
                    </dd>
                  </div>
                </dl>
              </article>
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Prochaines echeances
                </h2>
                <Link
                  className="text-sm text-brand-strong underline underline-offset-2"
                  href="/dashboard/evaluateur/reviews"
                >
                  Ouvrir mes reviews
                </Link>
              </div>

              {overviewQuery.data.prochainesEcheances.length === 0 ? (
                <p className="mt-3 rounded-xl border border-border/75 bg-white px-3 py-3 text-sm text-foreground-muted">
                  Aucune evaluation en attente. Rien ne vous est demande pour l&apos;instant.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {overviewQuery.data.prochainesEcheances.map((item) => (
                    <li
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                        item.enRetard
                          ? "border-red-200 bg-red-50"
                          : "border-border/75 bg-white"
                      }`}
                      key={item.applicationId}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.startupName}
                        </p>
                        <p className="truncate text-xs text-foreground-muted">
                          {item.programTitle}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          item.enRetard ? "text-red-700" : "text-foreground-muted"
                        }`}
                      >
                        {item.enRetard ? "En retard depuis le " : "Echeance : "}
                        {formatDate(item.deadlineAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </RoleGuard>
  );
}
