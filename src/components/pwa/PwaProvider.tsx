"use client";

import { useEffect, type ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { SERVICE_WORKER_URL } from "@/src/lib/pwa";
import InstallPrompt from "./InstallPrompt";
import ServiceWorkerUpdateBanner from "./ServiceWorkerUpdateBanner";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// En developpement, un service worker issu d'un `npm start` precedent sur le
// meme port servirait des chunks obsoletes : on le desinstalle.
function useUnregisterInDevelopment() {
  useEffect(() => {
    if (IS_PRODUCTION || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())));
  }, []);
}

export default function PwaProvider({ children }: { children: ReactNode }) {
  useUnregisterInDevelopment();

  return (
    <SerwistProvider
      swUrl={SERVICE_WORKER_URL}
      disable={!IS_PRODUCTION}
      // Les deux comportements par defaut sont desactives : le premier mettrait
      // en cache chaque page visitee (pages protegees comprises), le second
      // rechargerait la page au retour du reseau et ferait perdre une saisie.
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ scope: "/", type: "classic", updateViaCache: "none" }}
    >
      {children}
      <div className="pwa-prompts" aria-live="polite">
        <ServiceWorkerUpdateBanner />
        <InstallPrompt />
      </div>
    </SerwistProvider>
  );
}
