import { CheckCircle2, FileText, Rocket, Users } from "lucide-react";

const processSteps = [
  {
    number: "01",
    title: "Depot",
    description: "La startup soumet sa candidature via le formulaire en ligne.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Pre-selection",
    description: "Scoring automatique et tri par l&apos;equipe incubateur.",
    icon: CheckCircle2,
  },
  {
    number: "03",
    title: "Comite",
    description: "Evaluation approfondie par le panel d&apos;experts.",
    icon: Users,
  },
  {
    number: "04",
    title: "Incubation",
    description: "Demarrage du programme et suivi continu.",
    icon: Rocket,
  },
];

export default function IncubationJourneySection() {
  return (
    <section className="bg-muted/50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">Processus</p>
          <h2 className="text-3xl font-bold text-foreground lg:text-4xl">
            Du depot a l&apos;incubation en quelques etapes
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {processSteps.map((step) => {
            const Icon = step.icon;

            return (
              <div className="text-center" key={step.number}>
                <div className="relative mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <span className="text-2xl font-bold text-primary">{step.number}</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
