import Link from "next/link";

export default function FinalCTASection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="relative overflow-hidden rounded-[32px] border border-border/75 bg-gradient-to-br from-brand/95 via-[#dd7d12] to-[#bb5f03] p-6 shadow-[var(--shadow-soft)] md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-sky-200/25 blur-2xl" />

        <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-contrast/90">Pret A Structurer Votre Incubateur ?</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-brand-contrast md:text-5xl">
              Donnez a vos equipes un cockpit moderne pour accelerer l&apos;incubation.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-contrast/85 md:text-base">
              Lancez un environnement professionnel pour candidatures, evaluation, suivi startup
              et pilotage de programmes, avec une experience premium et credible.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link
              className="dashboard-btn rounded-xl bg-white px-5 py-3 text-sm font-medium text-brand-strong transition hover:brightness-95"
              href="/#landing-login"
            >
              Accelerer votre startup
            </Link>
            <Link
              className="dashboard-btn rounded-xl border border-white/70 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
              href="/dashboard"
            >
              Explorer la plateforme
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
