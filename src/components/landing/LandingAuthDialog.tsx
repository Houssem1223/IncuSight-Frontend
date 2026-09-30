"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { LandingAuthMode } from "@/src/lib/auth-routing";
import LandingLoginCard from "./LandingLoginCard";

type LandingAuthDialogProps = {
  mode: LandingAuthMode;
  sessionMessage?: string;
};

// Connexion / inscription en dialogue, ouvert par les routes existantes
// (/?auth=login|signup#landing-login, session expiree, /login). Fermer revient
// a la landing seule. LandingLoginCard est reutilise tel quel. Pas de portail :
// rendu au niveau racine de la page, il est present des le HTML serveur.
export default function LandingAuthDialog({ mode, sessionMessage }: LandingAuthDialogProps) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Premier champ du formulaire, pas le bouton Fermer qui le precede.
    (panel.current?.querySelector<HTMLElement>("input") ?? panel.current?.querySelector<HTMLElement>("button"))?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.replace("/", { scroll: false });
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const nodes = Array.from(
        panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select, textarea"),
      ).filter((node) => node.getClientRects().length > 0);
      const first = nodes[0];
      const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [router]);

  const close = () => router.replace("/", { scroll: false });

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <button
        aria-label="Fermer"
        className="fixed inset-0 bg-ink/45 backdrop-blur-sm"
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <div className="relative flex min-h-full items-center justify-center px-4 py-10">
        <div
          aria-label={mode === "signup" ? "Créer un compte" : "Connexion"}
          aria-modal="true"
          className="lp-enter relative w-full max-w-lg"
          ref={panel}
          role="dialog"
        >
          <button
            aria-label="Fermer"
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-lg text-ink/55 transition hover:bg-canvas hover:text-ink"
            onClick={close}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
          <LandingLoginCard initialMode={mode} key={mode} sessionMessage={sessionMessage} />
        </div>
      </div>
    </div>
  );
}
