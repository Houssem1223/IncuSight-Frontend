"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { OFFLINE_ROUTE } from "@/src/lib/pwa";

// Le service worker sert la page hors ligne a l'URL demandee : recharger
// relance donc la navigation d'origine. Seule une visite directe de /offline
// renvoie vers l'accueil.
function retry() {
  if (window.location.pathname === OFFLINE_ROUTE) {
    window.location.assign("/");
    return;
  }
  window.location.reload();
}

export default function OfflineRetryButton() {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Aucun formulaire sur cette page : recharger au retour du reseau ne perd rien.
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  return (
    <Button
      className="w-full"
      disabled={isRetrying}
      onClick={() => {
        setIsRetrying(true);
        retry();
      }}
      type="button"
    >
      <RefreshCw className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
      {isRetrying ? "Nouvelle tentative..." : "Réessayer"}
    </Button>
  );
}
