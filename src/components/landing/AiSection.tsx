import { GitCompareArrows, ListChecks, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

// Uniquement les fonctionnalites IA implementees (docs/ai-analysis-frontend.md,
// docs/startup-vigilance-frontend.md). Pas d'analyse de pitch deck ni de
// prediction de reussite : elles n'existent pas.
const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ListChecks,
    title: "Synthèse des évaluations",
    description: "Pour une candidature, une synthèse des évaluations soumises : points forts, points faibles et points à clarifier.",
  },
  {
    icon: GitCompareArrows,
    title: "Divergences entre évaluateurs",
    description: "Les écarts de notation sont repérés critère par critère et expliqués pour éclairer la discussion.",
  },
  {
    icon: Stethoscope,
    title: "Analyse d'accompagnement",
    description: "À partir des comptes rendus et des objectifs d'une startup incubée : difficultés récurrentes, signaux positifs et actions suggérées, avec leurs sources.",
  },
];

export default function AiSection() {
  return (
    <section aria-labelledby="ai-title" className="lp-section" id="intelligence">
      <div className="lp-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionIntro
              description="Des analyses générées pour l'équipe d'incubation, à partir des données déjà présentes dans la plateforme."
              eyebrow="Intelligence"
              id="ai-title"
              title="L'intelligence au service de l'incubation."
            />
            <p className="mt-6 flex items-start gap-3 rounded-2xl border border-ocean/15 bg-ocean-soft p-4 text-sm leading-relaxed text-ink/75" data-reveal>
              <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ocean" />
              Une aide consultative réservée à l&apos;administration : la décision reste humaine
              et se prend sur un écran distinct.
            </p>
          </div>

          <ul className="grid gap-4">
            {features.map(({ icon: Icon, title, description }, index) => (
              <li className="lp-card lp-card-hover flex gap-5 p-6" data-reveal key={title} style={revealDelay(index)}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ocean-soft text-ocean">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
