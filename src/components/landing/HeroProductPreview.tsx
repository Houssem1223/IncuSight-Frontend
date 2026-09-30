import {
  Bell,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/src/components/ui/progress";

// Illustration de l'interface, avec les composants reels de l'application
// (badges semantiques, barre de progression). Projets et valeurs sont des
// exemples, annonces comme tels dans la legende : aucun indicateur global.
const applications = [
  { name: "Projet Alpha", program: "Programme d'incubation", tone: "neutral", status: "Acceptée" },
  { name: "Projet Beta", program: "Programme d'incubation", tone: "info", status: "En évaluation" },
  { name: "Projet Gamma", program: "Programme d'incubation", tone: "warning", status: "En attente" },
];

const criteria = [
  { label: "Innovation", value: 90 },
  { label: "Marché", value: 80 },
  { label: "Équipe", value: 85 },
  { label: "Faisabilité", value: 70 },
];

const sidebarIcons = [LayoutDashboard, FileText, ClipboardCheck, TrendingUp, FolderKanban];

export default function HeroProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[36rem]">
      <div aria-hidden="true" className="lp-window">
        <div className="flex items-center gap-2 border-b border-ink/5 bg-canvas px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-[11px] text-ink/50 ring-1 ring-ink/5">
            IncuSight · Tableau de bord
          </span>
        </div>

        <div className="grid grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3 bg-[#1c293b] py-4">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Rocket className="h-4 w-4" />
            </span>
            {sidebarIcons.map((Icon, index) => (
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${
                  index === 3 ? "bg-[#44372f] text-[#ffca91]" : "text-[#a9b9cd]"
                }`}
                key={index}
              >
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>

          <div className="min-w-0 space-y-3 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ink">Pilotage de la cohorte</p>
              <span className="rounded-full bg-ocean-soft px-2.5 py-1 text-[11px] font-medium text-ocean">
                Programme
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="rounded-xl border border-ink/8 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Candidatures</p>
                <ul className="mt-2 space-y-2">
                  {applications.map((item) => (
                    <li className="flex items-center justify-between gap-2" key={item.name}>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink">{item.name}</span>
                        <span className="block truncate text-[10px] text-ink/45">{item.program}</span>
                      </span>
                      <span className="semantic-badge shrink-0" data-tone={item.tone}>{item.status}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden rounded-xl border border-ink/8 p-3 sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Évaluation</p>
                <p className="mt-1.5 text-xl font-semibold text-ink">
                  4,2 <span className="text-xs font-medium text-ink/45">/ 5</span>
                </p>
                <span className="semantic-badge mt-1" data-tone="neutral">Favorable</span>
                <ul className="mt-2.5 space-y-1.5">
                  {criteria.map((item) => (
                    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2" key={item.label}>
                      <span className="text-[10px] text-ink/55">{item.label}</span>
                      <Progress className="h-1.5 bg-ink/5" indicatorClassName="bg-ocean" value={item.value} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-ink/8 bg-gradient-to-br from-white to-orange-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Suivi d&apos;incubation</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">Projet Alpha · Construction</p>
                </div>
                <span className="semantic-badge shrink-0" data-tone="info">Actif</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress className="h-2 bg-ink/5" indicatorClassName="bg-brand" value={72} />
                <span className="whitespace-nowrap text-xs font-semibold text-ink">72 %</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="lp-card absolute -bottom-6 -left-4 hidden w-60 items-start gap-3 p-3.5 shadow-[0_24px_48px_-24px_rgba(7,20,38,0.35)] sm:flex lg:-left-10"
      >
        <span className="lp-icon h-9 w-9 rounded-lg">
          <Bell className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-ink">Décision publiée</span>
          <span className="mt-0.5 block text-[11px] leading-4 text-ink/55">
            Le porteur du Projet Alpha est notifié.
          </span>
        </span>
      </div>

      <figcaption className="mt-10 text-center text-xs text-ink/45 sm:mt-12">
        Illustration de l&apos;interface — données fictives
      </figcaption>
    </figure>
  );
}
