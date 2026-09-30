import { FOODSTART_URL, MEDIANET_INCUBATOR_URL, keyFigures } from "./landing-content";
import SectionIntro from "./SectionIntro";
import { revealDelay } from "./reveal";

// Chiffres publics de MEDIANET et de FoodStart, attribues a chaque carte.
// Aucun n'est une statistique d'IncuSight.
export default function KeyFiguresSection() {
  return (
    <section aria-labelledby="figures-title" className="lp-section bg-white">
      <div className="lp-container">
        <SectionIntro
          description="Des résultats publiés par MEDIANET, dont ceux de la première cohorte du programme FoodStart."
          eyebrow="Chiffres clés"
          id="figures-title"
          title="L'expertise MEDIANET, en chiffres."
        />

        <dl className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-ink/8 bg-ink/8 sm:grid-cols-2 lg:grid-cols-3">
          {keyFigures.map((figure, index) => (
            <div className="flex flex-col bg-white p-6 md:p-8" data-reveal key={figure.label} style={revealDelay(index)}>
              <dt className="order-2 mt-3 text-sm leading-relaxed text-ink/65">{figure.label}</dt>
              <dd className="order-1 text-4xl font-semibold tracking-[-0.04em] text-brand sm:text-5xl md:text-6xl">{figure.value}</dd>
              <dd className="order-3 mt-4 w-fit rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                {figure.scope}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-ink/50">
          Chiffres issus des programmes et communications officielles de MEDIANET (
          <a className="-my-2.5 inline-block py-2.5 underline underline-offset-2 hover:text-ink" href={MEDIANET_INCUBATOR_URL} rel="noopener noreferrer" target="_blank">
            MEDIANET Incubateur
          </a>
          ,{" "}
          <a className="-my-2.5 inline-block py-2.5 underline underline-offset-2 hover:text-ink" href={FOODSTART_URL} rel="noopener noreferrer" target="_blank">
            FoodStart
          </a>
          ).
        </p>
      </div>
    </section>
  );
}
