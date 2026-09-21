import {
  getEvidenceFallbackLabel,
  getEvidenceUpdateFields,
  resolveEvidenceRefs,
  type EvidenceContext,
} from "@/src/lib/startup-vigilance-view";

/**
 * Sur quelles données du suivi l'analyse s'appuie.
 *
 * Le modèle ne renvoie que des références temporaires (`U2`, `O1`). Le backend
 * joint `evidenceSources` avec les vrais identifiants, et les points
 * d'avancement et objectifs sont déjà chargés par l'écran : on affiche donc un
 * libellé lisible et le contenu réel, jamais la référence brute.
 *
 * Une référence qu'on ne sait pas résoudre n'est pas inventée : elle est
 * seulement comptée (« Basé sur 2 éléments du suivi »).
 */
export default function EvidenceSources({
  context,
  refs,
}: {
  context: EvidenceContext;
  refs: string[];
}) {
  const { resolved, unresolvedCount } = resolveEvidenceRefs(refs, context);

  if (resolved.length === 0 && unresolvedCount === 0) {
    return null;
  }

  return (
    <details className="inc-evidence mt-3 border-t border-border/60 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-foreground-muted">
        Voir les sources ({resolved.length + unresolvedCount})
      </summary>

      {resolved.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {resolved.map((evidence) => (
            <li key={`${evidence.kind}-${evidence.id}`}>
              {evidence.kind === "UPDATE" && evidence.update ? (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-foreground underline-offset-2 hover:text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                    {evidence.label}
                  </summary>
                  <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-background-accent p-3">
                    {getEvidenceUpdateFields(evidence.update).map((field) => (
                      <div key={field.label}>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-foreground-muted">
                          {field.label}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-foreground">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <p className="text-xs text-foreground">{evidence.label}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {unresolvedCount > 0 && (
        <p className="mt-2 text-xs italic text-foreground-muted">
          {getEvidenceFallbackLabel(unresolvedCount)}
        </p>
      )}
    </details>
  );
}
