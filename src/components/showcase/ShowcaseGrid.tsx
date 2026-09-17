"use client";

import { useEffect, useState } from "react";
import {
  getPublicShowcase,
  isAlumni,
  publicLogoUrl,
  type ShowcaseStartup,
} from "@/src/lib/public-showcase";

const PHASE_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding",
  DIAGNOSTIC: "Diagnostic",
  BUILD: "Construction",
  MARKET_VALIDATION: "Validation marché",
  PITCH_PREPARATION: "Préparation du pitch",
  CLOSING: "Clôture",
};

function StartupCard({ startup }: { startup: ShowcaseStartup }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/70 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {startup.hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- servi par l'API, hors pipeline next/image.
          <img
            alt={`Logo de ${startup.startupName}`}
            className="h-12 w-12 flex-none rounded-lg border border-border/70 object-contain"
            src={publicLogoUrl(startup.id)}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border border-border/70 bg-slate-50 text-sm font-semibold text-foreground-muted"
          >
            {startup.startupName.slice(0, 2).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {startup.startupName}
          </h3>
          <p className="truncate text-xs text-foreground-muted">
            {[startup.sector, startup.stage].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <p className="mt-4 flex-1 text-sm leading-6 text-foreground-muted">
        {startup.description?.trim() || "Aucune description publiée."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {startup.programTitle && (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-brand-strong">
            {startup.programTitle}
          </span>
        )}
        {startup.incubationPhase && !isAlumni(startup) && (
          <span className="rounded-full border border-border px-2.5 py-1 text-foreground-muted">
            {PHASE_LABELS[startup.incubationPhase] || startup.incubationPhase}
          </span>
        )}
      </div>

      {(startup.website || startup.linkedinUrl) && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3 text-sm">
          {startup.website && (
            <a
              className="text-brand-strong underline underline-offset-2"
              href={startup.website}
              rel="noreferrer noopener"
              target="_blank"
            >
              Site web
            </a>
          )}
          {startup.linkedinUrl && (
            <a
              className="text-brand-strong underline underline-offset-2"
              href={startup.linkedinUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              LinkedIn
            </a>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * Vitrine publique. Aucune donnée interne n'y transite : le backend n'expose que
 * les champs énumérés dans `findPublicShowcase`, et uniquement pour les profils
 * ayant explicitement opté pour la visibilité publique.
 */
export default function ShowcaseGrid() {
  const [startups, setStartups] = useState<ShowcaseStartup[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    getPublicShowcase()
      .then((data) => {
        if (isActive) {
          setStartups(data);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Le portefeuille n’a pas pu être chargé. Réessayez plus tard.");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (startups === null) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" key={index} />
        ))}
      </div>
    );
  }

  if (startups.length === 0) {
    return (
      <p className="rounded-2xl border border-border/70 bg-white px-4 py-6 text-center text-sm text-foreground-muted">
        Aucune startup ne figure encore au portefeuille public.
      </p>
    );
  }

  const current = startups.filter((startup) => !isAlumni(startup));
  const alumni = startups.filter(isAlumni);

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          En incubation
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {current.length} startup{current.length > 1 ? "s" : ""} accompagnée
          {current.length > 1 ? "s" : ""} actuellement.
        </p>

        {current.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-border/70 bg-white px-4 py-5 text-sm text-foreground-muted">
            Aucune startup en incubation dans le portefeuille public.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {current.map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
        )}
      </section>

      {alumni.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Alumni</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Startups ayant terminé leur parcours d’incubation.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.map((startup) => (
              <StartupCard key={startup.id} startup={startup} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
