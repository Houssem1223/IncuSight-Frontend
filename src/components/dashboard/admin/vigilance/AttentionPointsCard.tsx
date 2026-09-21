/**
 * Sujets que l'équipe pourrait examiner avec la startup.
 *
 * Rendu volontairement simple : ce sont des intitulés courts renvoyés par le
 * backend, jamais réécrits ici.
 */
export default function AttentionPointsCard({ points }: { points: string[] }) {
  if (points.length === 0) {
    return (
      <p className="mt-2 text-sm italic text-foreground-muted">
        Aucun point à examiner n’a été relevé.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-1.5 text-sm leading-6 text-foreground">
      {points.map((point) => (
        <li className="flex gap-2" key={point}>
          <span aria-hidden="true" className="text-foreground-muted">
            &ndash;
          </span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}
