import SectionIntro from "@/src/components/landing/SectionIntro";

type JourneyStep = {
  step: string;
  title: string;
  description: string;
};

const journeySteps: JourneyStep[] = [
  {
    step: "01",
    title: "Candidature",
    description: "Reception et qualification des dossiers startups via un pipeline unique.",
  },
  {
    step: "02",
    title: "Selection",
    description: "Evaluation multi-critere avec comites, scoring et consolidation des avis.",
  },
  {
    step: "03",
    title: "Incubation",
    description: "Activation du programme: objectifs, jalons et accompagnement personnalise.",
  },
  {
    step: "04",
    title: "Suivi",
    description: "Monitoring des progres startup et coordination continue avec les experts.",
  },
  {
    step: "05",
    title: "Decision",
    description: "Decision finale, trajectoire d&apos;evolution et capitalisation des apprentissages.",
  },
];

export default function IncubationJourneySection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="rounded-[30px] border border-border/75 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[var(--shadow-soft)] md:p-10">
        <SectionIntro
          description="Un flow lisible pour toutes les parties prenantes: startup, evaluateurs, experts et administrateurs."
          eyebrow="Parcours D&apos;Incubation"
          title="De la candidature a la decision, chaque etape est structuree."
        />

        <div className="mt-7 grid gap-3 lg:grid-cols-5">
          {journeySteps.map((step, index) => (
            <article className="relative rounded-2xl border border-border/70 bg-white p-4" key={step.step}>
              <span className="inline-flex rounded-full bg-brand/12 px-2.5 py-1 text-xs font-semibold tracking-[0.12em] text-brand-strong">
                {step.step}
              </span>

              <h3 className="mt-3 text-sm font-semibold text-foreground md:text-base">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{step.description}</p>

              {index < journeySteps.length - 1 && (
                <div className="pointer-events-none absolute -right-2 top-6 hidden h-[2px] w-4 bg-brand/35 lg:block" />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
