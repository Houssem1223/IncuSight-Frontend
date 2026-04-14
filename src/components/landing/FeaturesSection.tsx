import SectionIntro from "@/src/components/landing/SectionIntro";

type OfferItem = {
  title: string;
  description: string;
  tag: string;
};

const offerItems: OfferItem[] = [
  {
    title: "Gestion des candidatures",
    description:
      "Centralisez tous les dossiers startup, automatisez la qualification initiale et reduisez les pertes d&apos;information.",
    tag: "Intake",
  },
  {
    title: "Evaluation structuree",
    description:
      "Cadrez les revues avec des grilles homogenes, des notes comparables et des retours exploitables.",
    tag: "Review",
  },
  {
    title: "Suivi des startups",
    description:
      "Visualisez les objectifs, les etapes et les alertes pour accompagner les equipes dans la duree.",
    tag: "Tracking",
  },
  {
    title: "Reporting et indicateurs",
    description:
      "Exposez des KPI de programme, de selection et de performance pour des decisions mieux outillees.",
    tag: "Insights",
  },
  {
    title: "Programmes d&apos;incubation",
    description:
      "Parametrez vos cohortes, calendriers et fenetres de candidature avec une execution consistente.",
    tag: "Programs",
  },
];

export default function FeaturesSection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="motion-rise motion-rise-delay-2 rounded-[30px] border border-border/75 bg-white/75 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <SectionIntro
          description="Chaque module est concu pour fluidifier les operations incubateur et renforcer la qualite d&apos;accompagnement des entrepreneurs."
          eyebrow="Ce Que Nous Offrons"
          title="Une plateforme complete pour piloter l&apos;incubation de bout en bout."
        />

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {offerItems.map((item) => (
            <article
              className="dashboard-card rounded-2xl border border-border/75 bg-gradient-to-b from-white to-slate-50 p-4"
              key={item.title}
            >
              <span className="inline-flex rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-strong">
                {item.tag}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
