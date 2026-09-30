import { BadgeCheck, ClipboardCheck, FileText, Flag, LineChart, Rocket, type LucideIcon } from "lucide-react";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

// Etapes du cycle de vie reel d'une candidature dans IncuSight.
const steps: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: FileText, title: "Candidature", description: "La startup crée son profil et candidate à un programme ouvert." },
  { icon: ClipboardCheck, title: "Évaluation", description: "Les évaluateurs affectés notent le projet sur cinq critères." },
  { icon: BadgeCheck, title: "Sélection", description: "La décision s'appuie sur les évaluations et la startup est notifiée." },
  { icon: Rocket, title: "Incubation", description: "Un suivi s'ouvre, avec ses phases et ses objectifs." },
  { icon: LineChart, title: "Suivi", description: "Comptes rendus, objectifs et échéances sont suivis dans le temps." },
  { icon: Flag, title: "Décision / évolution", description: "Le suivi évolue de phase en phase jusqu'à sa clôture." },
];

export default function JourneySection() {
  return (
    <section aria-labelledby="journey-title" className="lp-section bg-white" id="parcours">
      <div className="lp-container">
        <SectionIntro
          align="center"
          description="Un parcours lisible pour chaque projet, de la première candidature à l'évolution après l'incubation."
          eyebrow="Comment ça fonctionne"
          id="journey-title"
          title="Six étapes, un seul parcours."
        />

        <ol className="lp-timeline mt-16 grid gap-8 lg:grid-cols-6 lg:gap-4">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li
              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] content-start gap-4 lg:grid-cols-1 lg:justify-items-center lg:gap-0 lg:text-center"
              data-reveal
              key={title}
              style={revealDelay(index)}
            >
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-brand text-sm font-semibold text-white shadow-[0_0_0_4px_rgba(249,115,22,0.15)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="lg:mt-6">
                <Icon aria-hidden="true" className="h-5 w-5 text-ink/40 lg:mx-auto" />
                <h3 className="mt-2 font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
