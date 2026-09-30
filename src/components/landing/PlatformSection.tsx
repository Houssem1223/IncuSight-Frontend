import { BarChart3, ClipboardCheck, FileStack, TrendingUp, type LucideIcon } from "lucide-react";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

const modules: { number: string; icon: LucideIcon; title: string; description: string }[] = [
  { number: "01", icon: FileStack, title: "Candidatures", description: "Centralisez les candidatures et suivez leur évolution." },
  { number: "02", icon: ClipboardCheck, title: "Évaluations", description: "Structurez l'évaluation des projets et facilitez la prise de décision." },
  { number: "03", icon: TrendingUp, title: "Suivi d'incubation", description: "Suivez les objectifs, les avancées et les besoins des startups incubées." },
  { number: "04", icon: BarChart3, title: "Pilotage", description: "Disposez d'une vision globale des programmes et de leur progression." },
];

export default function PlatformSection() {
  return (
    <section aria-labelledby="platform-title" className="lp-section bg-white" id="fonctionnalites">
      <div className="lp-container">
        <SectionIntro
          description="Une seule plateforme relie chaque étape, de la candidature au suivi des startups incubées."
          eyebrow="L'incubation en un seul espace"
          id="platform-title"
          title="Tout le parcours d'incubation, au même endroit."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map(({ number, icon: Icon, title, description }, index) => (
            <li
              className="lp-card lp-card-hover flex flex-col p-6"
              data-reveal
              key={number}
              style={revealDelay(index)}
            >
              <div className="flex items-center justify-between">
                <span className="lp-icon">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="font-mono text-sm font-semibold text-ink/25">{number}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
