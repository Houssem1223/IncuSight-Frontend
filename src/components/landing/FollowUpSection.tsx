import { AlertTriangle, CalendarClock, CheckCircle2, Flag, MessageSquareText, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { Progress } from "@/src/components/ui/progress";
import SectionIntro from "./SectionIntro";

const tracked: { icon: LucideIcon; label: string }[] = [
  { icon: TrendingUp, label: "Progression" },
  { icon: Target, label: "Objectifs" },
  { icon: CalendarClock, label: "Échéances" },
  { icon: MessageSquareText, label: "Comptes rendus" },
  { icon: AlertTriangle, label: "Blocages et besoins" },
  { icon: Flag, label: "Prochaines étapes" },
];

// Composition illustrative : memes blocs que l'ecran de suivi (couleurs
// semantiques reelles), valeurs d'exemple annoncees comme telles.
export default function FollowUpSection() {
  return (
    <section aria-labelledby="followup-title" className="lp-section bg-white" id="suivi">
      <div className="lp-container grid items-center gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <SectionIntro
            description="Après la sélection, chaque startup incubée dispose d'un suivi partagé avec l'équipe d'incubation : objectifs priorisés, échéances et comptes rendus réguliers."
            eyebrow="Suivi d'incubation"
            id="followup-title"
            title="De la sélection au suivi de la startup."
          />
          <ul className="mt-8 grid grid-cols-2 gap-3" data-reveal>
            {tracked.map(({ icon: Icon, label }) => (
              <li className="flex items-center gap-2.5 text-sm font-medium text-ink/75" key={label}>
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <figure className="relative" data-reveal>
          <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-orange-50 via-canvas to-ocean-soft md:-inset-6" />
          <div aria-hidden="true" className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="lp-card p-5 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Objectif</p>
                <span className="semantic-badge" data-tone="info">En cours</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-ink">Finaliser le prototype</p>
              <div className="mt-4 flex items-center gap-3">
                <Progress className="h-2 bg-ink/5" indicatorClassName="bg-brand" value={72} />
                <span className="whitespace-nowrap text-sm font-semibold text-ink">72 %</span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-ink/55">
                <CalendarClock className="h-4 w-4" />
                Échéance : 15 octobre
              </p>
            </div>

            <div className="lp-card space-y-2 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Compte rendu</p>
              <div className="rounded-xl bg-[var(--semantic-success-soft)] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--semantic-success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Réalisé
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink/70">Tests utilisateurs menés sur la première version.</p>
              </div>
              <div className="rounded-xl bg-[var(--semantic-danger-soft)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--semantic-danger)]">Blocage</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/70">Délai d&apos;un fournisseur de composants.</p>
              </div>
            </div>

            <div className="lp-card flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Prochaines étapes</p>
                <ul className="mt-3 space-y-2 text-xs text-ink/70">
                  <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-note)]" />Préparer la démonstration</li>
                  <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--semantic-note)]" />Planifier un point mentor</li>
                </ul>
              </div>
              <div className="rounded-xl bg-[var(--semantic-info-soft)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--semantic-info)]">Besoin</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/70">Mise en relation avec un expert métier.</p>
              </div>
            </div>
          </div>
          <figcaption className="relative mt-8 text-center text-xs text-ink/45">
            Exemple illustratif du fonctionnement de la plateforme
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
