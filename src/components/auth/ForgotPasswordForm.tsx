"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import {
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import {
  FORGOT_PASSWORD_COOLDOWN_SECONDS,
  getForgotPasswordEmailError,
  getForgotPasswordErrorMessage,
  requestForgotPassword,
} from "@/src/lib/password-recovery";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const isCoolingDown = cooldown > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      return;
    }

    const interval = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isCoolingDown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = getForgotPasswordEmailError(email);
    setEmailError(validationError || "");
    setRequestError("");
    setSuccessMessage("");

    if (validationError || isSubmitting || isCoolingDown) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestForgotPassword(email);
      setSuccessMessage(response.message);
      setCooldown(FORGOT_PASSWORD_COOLDOWN_SECONDS);
    } catch (error: unknown) {
      setRequestError(getForgotPasswordErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setEmailError("");
    setRequestError("");
    setSuccessMessage("");
  };

  return (
    <Card className="border-border/60 shadow-xl">
      <form aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
        <CardHeader className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand">
            <Mail className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Mot de passe oublié
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            Saisissez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </CardHeader>

        <CardContent>
          <FormField
            error={emailError || undefined}
            htmlFor="forgot-password-email"
            label="Email"
            required
          >
            <FormInput
              aria-describedby={emailError ? "forgot-password-email-error" : undefined}
              aria-invalid={Boolean(emailError)}
              autoComplete="email"
              disabled={isSubmitting || isCoolingDown}
              id="forgot-password-email"
              onChange={(event) => updateEmail(event.target.value)}
              placeholder="votre@email.com"
              required
              type="email"
              value={email}
            />
          </FormField>

          {successMessage && (
            <p
              aria-live="polite"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              role="status"
            >
              {successMessage}
            </p>
          )}

          <FormErrorMessage className="mt-4" message={requestError || undefined} />

          <Button
            className="mt-5 w-full"
            disabled={isSubmitting || isCoolingDown}
            type="submit"
          >
            {isSubmitting
              ? "Envoi en cours..."
              : isCoolingDown
                ? `Nouvel envoi dans ${cooldown} s`
                : "Envoyer le lien"}
          </Button>

          <div className="mt-4 text-center">
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href="/login"
            >
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
