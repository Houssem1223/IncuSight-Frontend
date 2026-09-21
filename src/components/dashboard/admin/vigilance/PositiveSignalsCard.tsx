import type { EvidenceContext } from "@/src/lib/startup-vigilance-view";
import type { VigilancePositiveSignal } from "@/src/types/startup-vigilance";
import EvidenceSources from "./EvidenceSources";

/**
 * Ce qui avance dans le suivi.
 *
 * Volontairement au même niveau que les difficultés : une lecture uniquement
 * négative ne servirait pas l'accompagnement.
 */
export default function PositiveSignalsCard({
  context,
  signals,
}: {
  context: EvidenceContext;
  signals: VigilancePositiveSignal[];
}) {
  if (signals.length === 0) {
    return (
      <p className="mt-2 text-sm italic text-foreground-muted">
        Aucun signal positif n’a été relevé dans les derniers points d’avancement.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-3">
      {signals.map((signal) => (
        <li
          className="rounded-xl border border-border/75 bg-surface p-4"
          key={signal.description}
        >
          <div className="flex gap-2">
            <span aria-hidden="true" className="text-emerald-600">
              &#10003;
            </span>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {signal.description}
            </p>
          </div>

          <EvidenceSources context={context} refs={signal.evidenceRefs} />
        </li>
      ))}
    </ul>
  );
}
