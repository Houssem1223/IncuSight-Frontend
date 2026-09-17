"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useUsers } from "@/src/contexts/UserContext";
import { ApiError } from "@/src/lib/api";
import { isValidEmail, isVerificationTokenValid } from "@/src/lib/auth-validation";
import {
  RESEND_VERIFICATION_COOLDOWN_SECONDS,
  getResendVerificationErrorMessage,
} from "@/src/lib/resend-verification";
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

  // Sans ce formulaire, un lien expiré est un cul-de-sac : AuthGuard refuse tout
  // compte non vérifié et la page n'offrait aucun moyen d'en redemander un.
  // L'adresse est saisie ici car la page n'a que le token, jamais l'email.
  const emailFieldId = useId();
  const { resendVerificationEmail } = useUsers();
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setResendCooldown((current) => current - 1), 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isResending || resendCooldown > 0) {
      return;
    }

    setResendMessage("");
    setResendError("");

    if (!isValidEmail(resendEmail.trim())) {
      setResendError("Saisissez une adresse email valide.");
      return;
    }

    setIsResending(true);

    try {
      const response = await resendVerificationEmail(resendEmail.trim());
      setResendMessage(
        response.message ||
          "Si un compte non vérifié existe pour cette adresse, un nouvel email vient d’être envoyé.",
      );
      setResendCooldown(RESEND_VERIFICATION_COOLDOWN_SECONDS);
    } catch (error) {
      setResendError(getResendVerificationErrorMessage(error));

      if (error instanceof ApiError && error.status === 429) {
        setResendCooldown(RESEND_VERIFICATION_COOLDOWN_SECONDS);
      }
    } finally {
      setIsResending(false);
    }
  };

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
          </div>
        )}

        {!isLoading && !isSuccess && (
          <form
            className="mx-auto mt-7 max-w-md border-t border-border/60 pt-6 text-left"
            onSubmit={(event) => void handleResend(event)}
          >
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor={emailFieldId}
            >
              Recevoir un nouveau lien de vérification
            </label>
            <p className="mt-1 text-xs text-foreground-muted">
              Saisissez l’adresse utilisée lors de votre inscription.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                autoComplete="email"
                id={emailFieldId}
                onChange={(event) => setResendEmail(event.target.value)}
                placeholder="vous@exemple.com"
                type="email"
                value={resendEmail}
              />
              <Button
                className="sm:w-auto"
                disabled={isResending || resendCooldown > 0}
                type="submit"
                variant="outline"
              >
                {isResending
                  ? "Envoi…"
                  : resendCooldown > 0
                    ? `Réessayer dans ${resendCooldown}s`
                    : "Renvoyer l’email"}
              </Button>
            </div>

            {resendMessage && (
              <p className="mt-3 text-sm text-emerald-700" role="status">
                {resendMessage}
              </p>
            )}

            {resendError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {resendError}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
