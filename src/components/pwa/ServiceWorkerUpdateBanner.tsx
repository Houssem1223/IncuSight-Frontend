"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSerwist } from "@serwist/turbopack/react";
import { Button } from "@/src/components/ui/button";

// Une application installee peut rester ouverte des jours sans navigation
// complete : on redemande la version du service worker au retour sur l'onglet,
// au plus une fois par heure.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function ServiceWorkerUpdateBanner() {
  const { serwist } = useSerwist();
  const [isWaiting, setIsWaiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const requestedUpdate = useRef(false);

  useEffect(() => {
    if (!serwist) {
      return;
    }

    const onWaiting = () => {
      setIsWaiting(true);
      setIsDismissed(false);
    };
    // Seul l'onglet qui a demande la mise a jour se recharge : les autres
    // onglets gardent leur saisie en cours, leur code reste fonctionnel.
    const onControlling = () => {
      if (requestedUpdate.current) {
        window.location.reload();
      }
    };

    let lastCheck = Date.now();
    const checkForUpdate = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        return;
      }
      if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
        return;
      }
      lastCheck = Date.now();
      void serwist.update().catch(() => undefined);
    };

    serwist.addEventListener("waiting", onWaiting);
    serwist.addEventListener("controlling", onControlling);
    document.addEventListener("visibilitychange", checkForUpdate);
    const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.clearInterval(interval);
    };
  }, [serwist]);

  if (!isWaiting || isDismissed) {
    return null;
  }

  const applyUpdate = () => {
    if (!serwist) {
      return;
    }
    requestedUpdate.current = true;
    setIsUpdating(true);
    serwist.messageSkipWaiting();
  };

  return (
    <div className="pwa-prompt" role="status">
      <span className="pwa-prompt-icon">
        <RefreshCw className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Nouvelle version disponible</p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">
          Enregistrez vos modifications en cours, puis mettez IncuSight à jour.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={isUpdating} onClick={applyUpdate} size="sm" type="button">
            {isUpdating ? "Mise à jour..." : "Mettre à jour"}
          </Button>
          <Button onClick={() => setIsDismissed(true)} size="sm" type="button" variant="ghost">
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}
