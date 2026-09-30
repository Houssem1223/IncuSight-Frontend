import type { CSSProperties } from "react";

// Decalage d'apparition des elements d'une meme grille (voir landing.css).
export function revealDelay(index: number): CSSProperties {
  return { "--reveal-index": index } as CSSProperties;
}
