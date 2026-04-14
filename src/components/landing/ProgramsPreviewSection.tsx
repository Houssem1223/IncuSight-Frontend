import Link from "next/link";
import SectionIntro from "@/src/components/landing/SectionIntro";

type ProgramPreview = {
  id: string;
  title: string;
  focus: string;
  period: string;
  capacity: string;
  summary: string;
  status: "OPEN" | "CLOSING_SOON";
};

const previewPrograms: ProgramPreview[] = [
  {
    id: "PRG-AI-2026",
    title: "AI Venture Launchpad",
    focus: "IA appliquee et automatisation business",
    period: "Mai 2026 - Octobre 2026",
    capacity: "25 startups",
    summary:
      "Un programme pour structurer produit, traction et execution commerciale des startups IA.",
    status: "OPEN",
  },
  {
    id: "PRG-GREENTECH-2026",
    title: "GreenTech Scale Track",
    focus: "Climate tech, energie, efficience operationnelle",
    period: "Juin 2026 - Novembre 2026",
    capacity: "18 startups",
    summary:
      "Accompagnement sur le go-to-market B2B, les pilotes industriels et la preparation investissement.",
    status: "OPEN",
  },
  {
    id: "PRG-B2B-SCALE-2026",
    title: "B2B Growth Sprint",
    focus: "SaaS B2B, ventes complexes, product-market fit",
    period: "Juillet 2026 - Decembre 2026",
    capacity: "22 startups",
    summary:
      "Sprint de croissance pour accelerer pipeline commercial, retention et performance produit.",
    status: "CLOSING_SOON",
  },
];

function getStatusChipClass(status: ProgramPreview["status"]) {
  if (status === "OPEN") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusLabel(status: ProgramPreview["status"]) {
  if (status === "OPEN") {
    return "Ouvert";
  }

  return "Cloture bientot";
}

export default function ProgramsPreviewSection() {
  return (
    <section className="mx-auto mt-7 max-w-6xl md:mt-10">
      <div className="rounded-[30px] border border-border/75 bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionIntro
            className="max-w-2xl"
            description="Bloc de previsualisation concu pour etre branche rapidement sur les donnees API des programmes existants."
            eyebrow="Programmes Ouverts"
            title="Identifiez les cohortes actives et candidatez rapidement."
          />

          <Link
            className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
            href="/#landing-login"
          >
            Voir tous les programmes
          </Link>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {previewPrograms.map((program) => (
            <article className="dashboard-card overflow-hidden rounded-2xl border border-border/70 bg-white" key={program.id}>
              <div className="border-b border-border/65 bg-gradient-to-r from-brand/10 via-white to-sky-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{program.title}</p>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusChipClass(program.status)}`}
                  >
                    {getStatusLabel(program.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">{program.id}</p>
              </div>

              <div className="space-y-3 p-4">
                <p className="text-sm leading-relaxed text-foreground-muted">{program.summary}</p>

                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Focus</dt>
                    <dd className="mt-0.5 text-foreground">{program.focus}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Periode</dt>
                    <dd className="mt-0.5 text-foreground">{program.period}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.14em] text-foreground-muted">Capacite</dt>
                    <dd className="mt-0.5 text-foreground">{program.capacity}</dd>
                  </div>
                </dl>

                <Link
                  className="dashboard-btn inline-flex rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                  href="/#landing-login"
                >
                  Commencer la candidature
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
