"use client";

import { useSyncExternalStore } from "react";

// Meme seuil que le breakpoint `sm` de Tailwind : en dessous, telephone.
const NARROW_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Ecran de telephone. Reserve aux composants qui ne peuvent pas s'adapter en
 * CSS seul (options d'un graphique Recharts). Le snapshot serveur renvoie
 * false : rendu desktop puis ajustement a l'hydratation.
 */
export function useIsNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
