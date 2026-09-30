import { ClipboardCheck, LayoutDashboard, Rocket, type LucideIcon } from "lucide-react";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

// Les trois roles de l'application et ce que chacun y trouve reellement.
const roles: { role: string; label: string; icon: LucideIcon; description: string; items: string[]; accent: string }[] = [
  {
    role: "Admin",
    label: "Administration de l'incubateur",
    icon: LayoutDashboard,
    description: "Pilotez les programmes, les candidatures et les évaluations depuis une vue centralisée.",
    items: ["Programmes et candidatures", "Affectation des évaluateurs", "Décisions et suivi d'incubation"],
    accent: "bg-orange-50 text-brand-strong",
  },
  {
    role: "Evaluator",
    label: "Évaluateur",
    icon: ClipboardCheck,
    description: "Accédez aux candidatures qui vous sont attribuées et structurez vos évaluations.",
    items: ["Candidatures attribuées", "Grille d'évaluation", "Échéances à venir"],
    accent: "bg-ocean-soft text-ocean",
  },
  {
    role: "Startup",
    label: "Porteur de projet",
    icon: Rocket,
    description: "Suivez votre candidature, votre incubation, vos objectifs et vos prochaines étapes.",
    items: ["Profil et pitch deck", "Statut des candidatures", "Objectifs et comptes rendus"],
    accent: "bg-green-50 text-leaf",
  },
];

export default function RolesSection() {
  return (
    <section aria-labelledby="roles-title" className="lp-section" id="modules">
      <div className="lp-container">
        <SectionIntro
          description="Chaque profil dispose de son propre espace et ne voit que ce qui le concerne."
          eyebrow="Pour chaque utilisateur"
          id="roles-title"
          title="Une expérience adaptée à chaque rôle."
        />

        <ul className="mt-14 grid gap-4 lg:grid-cols-3">
          {roles.map(({ role, label, icon: Icon, description, items, accent }, index) => (
            <li className="lp-card lp-card-hover flex flex-col p-7" data-reveal key={role} style={revealDelay(index)}>
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${accent}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink">{role}</h3>
                  <p className="text-xs text-ink/50">{label}</p>
                </div>
              </div>
              <p className="mt-6 text-base leading-relaxed text-ink/75">{description}</p>
              <ul className="mt-6 space-y-2.5 border-t border-ink/8 pt-5">
                {items.map((item) => (
                  <li className="flex items-center gap-2.5 text-sm text-ink/60" key={item}>
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
