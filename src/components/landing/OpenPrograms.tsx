"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { LANDING_SIGNUP_ROUTE } from "@/src/lib/auth-routing";
import { isProgramOpen } from "@/src/lib/program-availability";
import type { Program } from "@/src/types/program";

const MAX_PROGRAMS = 3;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

// Programmes reellement ouverts, lus sur la route publique de l'API. En cas
// d'erreur ou d'absence, rien n'est affiche : aucun programme de remplacement.
export default function OpenPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch<Program[]>("program/public", {})
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        const open = data
          .filter((program) => isProgramOpen(program))
          // FoodStart est deja presente a partir de la page officielle.
          .filter((program) => !/foodstart/i.test(program.title))
          .slice(0, MAX_PROGRAMS);
        setPrograms(open);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (programs.length === 0) return null;

  return (
    <div className="mt-14">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink/50">
        Candidatures ouvertes sur IncuSight
      </h3>
      <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programs.map((program) => (
          <li className="lp-card lp-card-hover flex flex-col p-6" key={program.id}>
            <span className="semantic-badge w-fit" data-tone="neutral">Ouvert</span>
            <p className="mt-4 text-lg font-semibold tracking-tight text-ink">{program.title}</p>
            {program.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/60">{program.description}</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-ink/55">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              Candidatures jusqu&apos;au {formatDate(program.closeDate)}
            </p>
            <Link
              className="lp-cta mt-6 inline-flex h-11 w-fit items-center gap-2 text-sm font-semibold text-brand-strong"
              href={LANDING_SIGNUP_ROUTE}
            >
              Candidater
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
