import { BellRing, History, KeyRound, ShieldCheck, type LucideIcon } from "lucide-react";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

// Mecanismes reellement presents (docs/project-overview.md §6, backlog §6).
const pillars: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: "Rôles et permissions",
    description: "Administration, évaluateur et startup : chaque accès est vérifié par le serveur, rôle par rôle.",
  },
  {
    icon: KeyRound,
    title: "Authentification et accès",
    description: "Vérification de l'adresse email, réinitialisation sécurisée du mot de passe et révocation des sessions.",
  },
  {
    icon: History,
    title: "Traçabilité",
    description: "Décisions datées et historique des révisions, chacune accompagnée de son motif.",
  },
  {
    icon: BellRing,
    title: "Notifications et centralisation",
    description: "Chaque étape clé est notifiée aux personnes concernées, et l'information reste réunie dans un seul espace.",
  },
];

export default function GovernanceSection() {
  return (
    <section aria-labelledby="governance-title" className="lp-section bg-white">
      <div className="lp-container">
        <SectionIntro
          align="center"
          description="Des règles d'accès nettes et un historique lisible, pour que chaque décision reste explicable."
          eyebrow="Confiance"
          id="governance-title"
          title="Une gouvernance claire à chaque étape."
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, description }, index) => (
            <li className="lp-card lp-card-hover p-6" data-reveal key={title} style={revealDelay(index)}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-6 font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
