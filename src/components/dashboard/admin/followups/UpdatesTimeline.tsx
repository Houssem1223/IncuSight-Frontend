"use client";

import type { FollowUpUpdate } from "@/src/types/incubation-followups";
import { formatDate } from "./followupHelpers";

type UpdatesTimelineProps = {
  updates: FollowUpUpdate[];
};

export default function UpdatesTimeline({ updates }: UpdatesTimelineProps) {
  return (
    <section className="dashboard-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Journal d’avancement</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Comptes rendus publiés par la startup, du plus récent au plus ancien.
        </p>
      </div>

      {updates.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
          Aucun compte rendu transmis.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {updates.map((update) => (
          <article className="relative border-l-2 border-orange-200 pl-5" key={update.id}>
            <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand" />
            <div className="dashboard-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {update.title || "Point d’avancement"}
                  </h3>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {update.author?.email || "Startup"} · {formatDate(update.createdAt, true)}
                  </p>
                </div>
                {typeof update.progress === "number" && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-brand-strong">
                    {update.progress} %
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-emerald-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
                    Réalisé
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{update.done}</p>
                </div>
                {update.nextSteps && (
                  <div className="rounded-xl bg-sky-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
                      Prochaines étapes
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{update.nextSteps}</p>
                  </div>
                )}
                {update.blockers && (
                  <div className="rounded-xl bg-red-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
                      Blocages
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{update.blockers}</p>
                  </div>
                )}
                {update.needs && (
                  <div className="rounded-xl bg-amber-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
                      Besoins
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{update.needs}</p>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
