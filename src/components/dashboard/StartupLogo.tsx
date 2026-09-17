"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { API_URL } from "@/src/lib/api";

type StartupLogoProps = {
  startupId: string;
  startupName: string;
  /** Faux si le profil n'a pas de logo : evite un aller-retour voue a un 404. */
  hasLogo: boolean;
  className?: string;
};

/**
 * Le logo est servi par une route authentifiee (Bearer) : une balise <img src>
 * pointant dessus recevrait un 401, et next/image ne sait pas davantage poser
 * l'en-tete. On telecharge donc le binaire puis on l'expose via une object URL,
 * revoquee au demontage pour ne pas fuir de memoire.
 */
export default function StartupLogo({
  startupId,
  startupName,
  hasLogo,
  className = "h-12 w-12 rounded-lg border border-border/70 object-contain",
}: StartupLogoProps) {
  const { token } = useAuth();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLogo || !token) {
      return;
    }

    let isActive = true;
    let createdUrl: string | null = null;

    fetch(`${API_URL}/startup/${startupId}/logo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || !isActive) {
          return;
        }

        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        // Un logo manquant ne doit jamais casser l'ecran qui l'affiche.
      });

    return () => {
      isActive = false;

      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [hasLogo, startupId, token]);

  if (!hasLogo || !objectUrl) {
    return (
      <span
        aria-hidden="true"
        className={`${className} flex items-center justify-center bg-slate-50 text-xs font-semibold text-foreground-muted`}
      >
        {startupName.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- source blob: locale, next/image ne s'applique pas.
    <img alt={`Logo de ${startupName}`} className={className} src={objectUrl} />
  );
}
