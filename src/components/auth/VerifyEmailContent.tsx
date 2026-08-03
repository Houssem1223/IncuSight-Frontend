"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import { buttonVariants } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { isVerificationTokenValid } from "@/src/lib/auth-validation";
import {
  classifyVerificationError,
  getInitialVerificationState,
  verifyEmailOnce,
  type VerificationState,
} from "@/src/lib/email-verification";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";

type VerifyEmailContentProps = {
  token?: string;
};

export default function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const hasValidToken = isVerificationTokenValid(token);
  const [state, setState] = useState<VerificationState>(
    getInitialVerificationState(token),
  );
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!hasValidToken) {
      return;
    }

    let isActive = true;

    verifyEmailOnce(token)
      .then((response) => {
        if (!isActive) {
          return;
        }

        setSuccessMessage(response.message || "Adresse email vérifiée avec succès.");
        setState("success");
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState(classifyVerificationError(error));
      });

    return () => {
      isActive = false;
    };
  }, [hasValidToken, token]);

  const isSuccess = state === "success";
  const isLoading = state === "loading";
  const title = isLoading
    ? "Vérification en cours…"
    : isSuccess
      ? "Votre adresse email a été vérifiée"
      : state === "invalid"
        ? "Lien invalide ou expiré"
        : "Une erreur réseau est survenue";
  const description = isLoading
    ? "Veuillez patienter pendant l’activation de votre compte."
    : isSuccess
      ? successMessage
      : state === "invalid"
        ? "Ce lien est absent, incorrect, expiré ou a déjà été utilisé."
        : "Le service de vérification est temporairement indisponible. Réessayez plus tard.";

  return (
    <Card className="border-border/60 shadow-xl">
      <CardContent className="px-6 py-9 text-center">
        <div
          aria-live={isLoading ? "polite" : "assertive"}
          role={isLoading || isSuccess ? "status" : "alert"}
        >
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              isLoading
                ? "bg-orange-50 text-brand"
                : isSuccess
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
            }`}
          >
            {isLoading ? (
              <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
            ) : isSuccess ? (
              <MailCheck className="h-7 w-7" aria-hidden="true" />
            ) : (
              <CircleAlert className="h-7 w-7" aria-hidden="true" />
            )}
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        </div>

        {!isLoading && (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className={buttonVariants()} href={LANDING_LOGIN_ROUTE}>
              Aller à la connexion
            </Link>
            {!isSuccess && (
              <button
                className={buttonVariants({ variant: "outline" })}
                disabled
                title="Fonctionnalité bientôt disponible"
                type="button"
              >
                Renvoyer l’email (bientôt)
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
