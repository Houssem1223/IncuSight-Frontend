import SectionIntro from "@/src/components/landing/SectionIntro";

const missionPillars = [
  {
    title: "Accompagnement structure",
    description:
      "Cadrez les interactions entre equipe incubateur, experts et startups avec des parcours homogenes.",
  },
  {
    title: "Evaluation transparente",
    description:
      "Consolidez les retours, les scores et les decisions dans un espace unique, lisible et auditable.",
  },
  {
    title: "Suivi operationnel",
    description:
      "Pilotez les programmes, les candidatures et les evolutions startup avec des indicateurs actionnables.",
  },
];

export default function MissionSection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="dashboard-surface motion-rise motion-rise-delay-1 p-6 md:p-10">
        <SectionIntro
          description="IncuSight soutient les incubateurs qui veulent professionnaliser leur pilotage: de la reception des candidatures a la decision finale, en passant par l&apos;evaluation et le suivi."
          eyebrow="Notre Mission"
          title="Un incubateur digital pour accompagner les startups avec rigueur et impact."
        />

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-border/75 bg-white/90 p-5 md:p-6">
            <h3 className="text-lg font-semibold text-foreground">L&apos;incubateur, version produit SaaS</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted md:text-base">
              Notre approche combine exigence institutionnelle et execution produit. Chaque
              programme suit un cadre clair: objectifs, jalons, comites d&apos;evaluation,
              recommandations d&apos;experts et reporting continu pour les equipes dirigeantes.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Parcours</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Candidature au suivi</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Vision</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Innovation responsable</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Pilotage</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Data et gouvernance</p>
              </div>
            </div>
          </article>

          <div className="grid gap-3">
            {missionPillars.map((pillar) => (
              <article className="rounded-2xl border border-border/75 bg-white/90 p-4" key={pillar.title}>
                <h3 className="text-sm font-semibold text-foreground md:text-base">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
