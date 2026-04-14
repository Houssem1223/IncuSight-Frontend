import SectionIntro from "@/src/components/landing/SectionIntro";

const differentiators = [
  {
    title: "Expertise operationnelle",
    description: "Des workflows concus pour les realites terrain d&apos;un incubateur et de ses comites.",
  },
  {
    title: "Accompagnement continu",
    description: "Un suivi structure des startups, depuis l&apos;onboarding jusqu&apos;aux decisions strategiques.",
  },
  {
    title: "Vision data-driven",
    description: "Des indicateurs fiables pour arbitrer plus vite et mieux orienter les ressources.",
  },
  {
    title: "Simplicite de gestion",
    description: "Une experience claire pour ADMIN, STARTUP et EVALUATOR, sans dette operationnelle.",
  },
];

export default function WhyChooseSection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="dashboard-surface p-6 md:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionIntro
            description="IncuSight s&apos;adresse aux incubateurs qui veulent renforcer leur credibilite institutionnelle, leur qualite d&apos;execution et leur capacite a faire grandir les startups."
            eyebrow="Pourquoi Nous Choisir"
            title="Un positionnement premium entre innovation, gouvernance et impact entrepreneurial."
          />

          <div className="rounded-2xl border border-border/75 bg-white/90 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">Vision Incubateur</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted md:text-base">
              Notre ambition est de fournir une plateforme qui aligne vitesse d&apos;execution,
              transparence de decision et excellence d&apos;accompagnement. Vous construisez un
              ecosysteme startup plus robuste, plus lisible et plus performant.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {differentiators.map((item) => (
            <article className="rounded-2xl border border-border/75 bg-white p-4" key={item.title}>
              <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
