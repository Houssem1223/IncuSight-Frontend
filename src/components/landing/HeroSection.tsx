import Link from "next/link";
import LandingLoginCard from "@/src/components/landing/LandingLoginCard";

const trustHighlights = [
  "Comites d evaluation multi-profils",
  "Workflow candidature-selection-incubation",
  "Pilotage data-driven pour decisions rapides",
];

const heroStats = [
  { label: "Programmes suivis", value: "40+" },
  { label: "Experts mobilises", value: "120" },
  { label: "Dossiers traites", value: "1.8k" },
];

export default function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="motion-rise relative overflow-hidden rounded-[34px] border border-border/75 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 top-20 h-60 w-60 rounded-full bg-sky-300/25 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-strong">
              IncuSight | Digital Incubator Platform
            </p>

            <h1 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-tight text-foreground md:text-6xl">
              Accelerez les decisions d&apos;incubation avec une gouvernance claire.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground-muted md:text-lg">
              IncuSight connecte candidatures, evaluations, suivi startup et pilotage de
              programmes dans une interface corporate, moderne et orientee execution.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="dashboard-btn rounded-xl bg-brand px-5 py-3 text-sm font-medium text-brand-contrast shadow-sm transition hover:brightness-95"
                href="#landing-login"
              >
                Commencer votre candidature
              </a>
              <Link
                className="dashboard-btn rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                href="/dashboard"
              >
                Decouvrir les programmes
              </Link>
            </div>

            <div className="mt-7 grid gap-2 text-sm text-foreground-muted sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div className="rounded-xl border border-border/70 bg-white/80 px-3 py-2" key={stat.label}>
                  <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="motion-rise motion-rise-delay-1 dashboard-surface p-5 md:p-6">
            <LandingLoginCard />

            <ul className="mt-4 space-y-2">
              {trustHighlights.map((item) => (
                <li className="rounded-lg border border-border/70 bg-slate-50 px-3 py-2 text-sm text-foreground" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
