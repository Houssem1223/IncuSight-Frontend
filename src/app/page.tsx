import Link from "next/link";

export default function Home() {
  return (
    <main className="px-4 pb-16 pt-10 md:px-8 md:pb-24 md:pt-14">
      <section className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="motion-rise rounded-[28px] border border-border/80 bg-surface/85 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-strong">
            Medianet Incubator Platform
          </p>

          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Faster incubation decisions, clearer execution.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground-muted md:text-lg">
            IncuSight centralizes startup dossiers, evaluator workflows, and
            decision tracking so your team can move from review to action with
            less friction.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-xl bg-brand px-5 py-3 text-sm font-medium text-brand-contrast shadow-sm transition hover:brightness-95"
              href="/login"
            >
              Open Workspace
            </Link>
            <Link
              className="rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
              href="/dashboard"
            >
              Preview Dashboard
            </Link>
          </div>
        </div>

        <aside className="motion-rise motion-rise-delay-1 rounded-[28px] border border-border/80 bg-gradient-to-br from-surface-strong via-white to-surface p-6 shadow-[var(--shadow-soft)] md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-strong">
            Live Focus
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border/80 bg-white p-4">
              <p className="text-sm text-foreground-muted">Evaluation queue</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">24 cases</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-white p-4">
              <p className="text-sm text-foreground-muted">Avg. review cycle</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">2.8 days</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-white p-4">
              <p className="text-sm text-foreground-muted">Decision confidence</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">87%</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="motion-rise motion-rise-delay-2 mx-auto mt-6 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-border/75 bg-white/90 p-5">
          <h2 className="text-lg font-semibold text-foreground">Role-specific UX</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Admin, startup, and evaluator journeys are separated for clarity and
            reduced operational noise.
          </p>
        </article>

        <article className="rounded-2xl border border-border/75 bg-white/90 p-5">
          <h2 className="text-lg font-semibold text-foreground">Actionable pipeline</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Follow each project from intake to scoring with consistent status and
            transparent ownership.
          </p>
        </article>

        <article className="rounded-2xl border border-border/75 bg-white/90 p-5">
          <h2 className="text-lg font-semibold text-foreground">Decision support</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Organize feedback, reduce bias, and keep decision logs ready for
            review at any time.
          </p>
        </article>
      </section>
    </main>
  );
}
