// Constantes et regles pures de la PWA, partagees par le manifest, le layout
// racine et les composants d'installation. Voir docs/pwa.md.

/** `--brand` de globals.css : couleur principale d'IncuSight. */
export const PWA_THEME_COLOR = "#f97316";
export const PWA_BACKGROUND_COLOR = "#ffffff";

/** URL du service worker, servi par src/app/serwist/[path]/route.ts. */
export const SERVICE_WORKER_URL = "/serwist/sw.js";

/** Page renvoyee par le service worker quand une navigation echoue hors ligne. */
export const OFFLINE_ROUTE = "/offline";

export const INSTALL_DISMISSED_KEY = "incusight:pwa-install-dismissed-at";
/** Duree pendant laquelle la proposition d'installation reste masquee. */
export const INSTALL_DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function isInstallDismissed(
  dismissedAt: string | null,
  now: number = Date.now(),
): boolean {
  const timestamp = Number(dismissedAt);
  if (!dismissedAt || !Number.isFinite(timestamp)) {
    return false;
  }
  return now - timestamp < INSTALL_DISMISS_DURATION_MS;
}

/**
 * Safari iOS/iPadOS n'emet pas `beforeinstallprompt` : l'installation passe
 * par « Partager > Sur l'ecran d'accueil ». iPadOS se presente comme un Mac,
 * d'ou le test sur l'ecran tactile.
 */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

