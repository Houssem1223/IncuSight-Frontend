import { ArrowUpRight, Briefcase, Cpu, Handshake, Lightbulb, Building2, type LucideIcon } from "lucide-react";
import { MEDIANET_INCUBATOR_URL } from "./landing-content";
import { revealDelay } from "./reveal";

// Uniquement des elements publies sur la page MEDIANET Incubateur.
const pillars: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Cpu, title: "Expertise technologique", description: "Le savoir-faire des experts techniques de MEDIANET." },
  { icon: Briefcase, title: "Expertise métier", description: "L'accompagnement d'experts métiers aux côtés des porteurs de projets." },
  { icon: Handshake, title: "Partenaires", description: "Un réseau de partenaires et une ouverture sur l'écosystème." },
  { icon: Lightbulb, title: "Intrapreneuriat", description: "Les Medianautes peuvent transformer une idée en startup." },
  { icon: Building2, title: "Espace d'innovation", description: "MEDIANET Incubateur Space, dédié à l'entrepreneuriat et à l'intrapreneuriat." },
];

export default function MedianetSection() {
  return (
    <section aria-labelledby="medianet-title" className="lp-section relative overflow-hidden bg-ink text-white" id="a-propos">
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
      <div aria-hidden="true" className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />

      <div className="lp-container relative grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div data-reveal>
          <p className="lp-eyebrow !text-orange-300">MEDIANET Incubator</p>
          <h2
            className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-4xl md:text-[2.6rem]"
            id="medianet-title"
          >
            Un écosystème pensé pour faire émerger l&apos;innovation.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
            MEDIANET accompagne les porteurs de projets et les startups innovantes grâce à son
            expertise technologique et métier, son réseau de partenaires et son ouverture sur
            l&apos;écosystème entrepreneurial.
          </p>
          <a
            className="lp-cta mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/5"
            href={MEDIANET_INCUBATOR_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            Découvrir MEDIANET Incubateur
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {pillars.map(({ icon: Icon, title, description }, index) => (
            <li
              className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-orange-300/40 hover:bg-white/[0.07] ${
                index === pillars.length - 1 ? "sm:col-span-2" : ""
              }`}
              data-reveal
              key={title}
              style={revealDelay(index)}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-orange-300">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
