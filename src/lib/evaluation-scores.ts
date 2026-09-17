/**
 * Bornes de notation d'une evaluation.
 *
 * Le backend valide chaque sous-score en `@IsInt() @Min(1) @Max(5)`
 * (submit-evaluation.dto.ts). Les champs du formulaire acceptaient auparavant
 * 0 a 10 par pas de 0,1 : toute note decimale ou superieure a 5 partait en 400
 * a la soumission, sans que rien ne l'annonce a l'evaluateur.
 */
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

export function isValidScore(value: number | undefined): value is number {
  return (
    value !== undefined &&
    Number.isInteger(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX
  );
}

/** Parse une saisie de formulaire ; `undefined` si le champ est vide ou invalide. */
export function parseScore(input: string): number | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : undefined;
}
