import { ArrowUpRight, Check, Utensils } from "lucide-react";
import { FOODSTART_URL, foodStart } from "./landing-content";
import OpenPrograms from "./OpenPrograms";
import SectionIntro from "./SectionIntro";

// FoodStart : seul programme presente, avec les elements de sa page officielle.
// Les programmes ouverts dans la plateforme s'ajoutent depuis l'API.
export default function ProgramsSection() {
  return (
    <section aria-labelledby="programs-title" className="lp-section" id="programmes">
      <div className="lp-container">
        <SectionIntro
          description="Des programmes d'incubation portés par MEDIANET, de la sélection jusqu'à l'accès au marché."
          eyebrow="Programmes"
          id="programs-title"
          title="Des programmes pour transformer les idées en projets."
        />

        <article
          aria-labelledby="foodstart-title"
          className="lp-card mt-14 grid overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          data-reveal
        >
          <div className="relative flex flex-col justify-between gap-10 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-ocean-soft p-7 md:p-10">
            <div aria-hidden="true" className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[28px] border-orange-200/40" />
            <div className="relative">
              <span className="lp-icon h-12 w-12 bg-white shadow-sm">
                <Utensils aria-hidden="true" className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-strong">{foodStart.sector}</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl" id="foodstart-title">
                {foodStart.name}
              </h3>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-ink/65">{foodStart.description}</p>
            </div>
            <p className="relative w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-ink/8">
              {foodStart.duration}
            </p>
          </div>

          <div className="flex flex-col justify-between gap-8 p-7 md:p-10">
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {foodStart.highlights.map((item) => (
                <li className="flex items-start gap-3 text-sm leading-relaxed text-ink/75" key={item}>
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-50 text-leaf">
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              className="lp-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 text-sm font-semibold text-white transition hover:bg-ink/85 sm:w-fit"
              href={FOODSTART_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              Découvrir
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">FoodStart sur le site de MEDIANET (nouvel onglet)</span>
            </a>
          </div>
        </article>

        <OpenPrograms />
      </div>
    </section>
  );
}
