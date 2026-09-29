"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  INSTALL_DISMISSED_KEY,
  isInstallDismissed,
  isIosDevice,
} from "@/src/lib/pwa";

// Evenement non standard de Chromium (Chrome, Edge, Samsung Internet...).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getIsStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia(STANDALONE_QUERY).matches || navigatorWithStandalone.standalone === true
  );
}

const noSubscription = () => () => undefined;

function getIsIos() {
  return isIosDevice(navigator.userAgent, navigator.maxTouchPoints);
}

function readDismissedAt() {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY);
  } catch {
    return null;
  }
}

export default function InstallPrompt() {
  // Le rendu serveur considere l'application comme installee : rien n'est
  // affiche avant l'hydratation, donc pas d'ecart de rendu ni de clignotement.
  const isStandalone = useSyncExternalStore(subscribeStandalone, getIsStandalone, () => true);
  const isIos = useSyncExternalStore(noSubscription, getIsIos, () => false);
  const dismissedAt = useSyncExternalStore(noSubscription, readDismissedAt, () => null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Remplace la mini-barre native de Chrome mobile par la carte ci-dessous.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canPrompt = installEvent !== null;
  if (
    isStandalone ||
    isInstalled ||
    isDismissed ||
    isInstallDismissed(dismissedAt) ||
    (!canPrompt && !isIos)
  ) {
    return null;
  }

  const dismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // Stockage indisponible (navigation privee) : masque pour cette page seulement.
    }
  };

  const install = async () => {
    if (!installEvent) {
      return;
    }
    // Un evenement ne peut etre utilise qu'une fois.
    setInstallEvent(null);
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "dismissed") {
      dismiss();
    }
  };

  return (
    <div className="pwa-prompt" role="region" aria-label="Installer IncuSight">
      <span className="pwa-prompt-icon">
        <Download className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Installer IncuSight</p>
        {canPrompt ? (
          <>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              Accédez à IncuSight depuis votre écran d&apos;accueil ou votre bureau, dans sa
              propre fenêtre.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void install()} size="sm" type="button">
                Installer
              </Button>
              <Button onClick={dismiss} size="sm" type="button" variant="ghost">
                Plus tard
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs leading-5 text-foreground-muted">
            Touchez{" "}
            <Share className="inline h-4 w-4 align-text-bottom text-brand" aria-label="Partager" />{" "}
            puis « Sur l&apos;écran d&apos;accueil »{" "}
            <SquarePlus
              className="inline h-4 w-4 align-text-bottom text-brand"
              aria-hidden="true"
            />
            .
          </p>
        )}
      </div>
      <button aria-label="Fermer" className="pwa-prompt-close" onClick={dismiss} type="button">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
