"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import {
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { useUsers } from "@/src/contexts/UserContext";
import { ApiError } from "@/src/lib/api";
import {
  PASSWORD_REQUIREMENTS,
  type SignupFieldErrors,
  type SignupFormValues,
  validateSignupForm,
} from "@/src/lib/auth-validation";
import {
  SIGNUP_SUCCESS_TITLE,
  getSignupSuccessState,
  type SignupSuccessState,
} from "@/src/lib/signup";
import {
  RESEND_VERIFICATION_COOLDOWN_SECONDS,
  getResendVerificationErrorMessage,
} from "@/src/lib/resend-verification";

const initialValues: SignupFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type SignupFormProps = {
  onShowLogin: () => void;
};

export default function SignupForm({ onShowLogin }: SignupFormProps) {
  const { resendVerificationEmail, signup } = useUsers();
  const [values, setValues] = useState<SignupFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SignupSuccessState | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const isResendCoolingDown = resendCooldown > 0;

  useEffect(() => {
    if (!isResendCoolingDown) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isResendCoolingDown]);

  const updateField = (field: keyof SignupFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateSignupForm(values);
    setFieldErrors(errors);
    setRequestError("");

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await signup({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      setSuccess(getSignupSuccessState(response, values.email));
      setValues(initialValues);
    } catch (error) {
      setRequestError(
        error instanceof ApiError
          ? error.message
          : "Une erreur réseau est survenue. Veuillez réessayer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!success || isResending || isResendCoolingDown) {
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setResendError("");

    try {
      const response = await resendVerificationEmail(success.email);
      setResendMessage(
        response.message || "L’email de vérification a été renvoyé.",
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

  if (success) {
    return (
      <Card className="border-border/60 shadow-xl">
        <CardContent className="px-6 py-8 text-center" aria-live="polite" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {SIGNUP_SUCCESS_TITLE}
          </h2>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">{success.message}</p>
          <p className="mt-3 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm font-medium text-foreground">
            {success.email}
          </p>
          <p className="mt-3 text-xs text-foreground-muted">
            Cliquez sur le lien reçu pour activer votre compte avant de vous connecter.
          </p>
          <Button
            aria-busy={isResending}
            className="mt-6 w-full"
            disabled={isResending || isResendCoolingDown}
            onClick={() => void handleResendVerificationEmail()}
            type="button"
            variant="outline"
          >
            {isResending
              ? "Envoi en cours..."
              : isResendCoolingDown
                ? `Renvoyer l’email (${resendCooldown} s)`
                : "Renvoyer l’email"}
          </Button>
          {resendMessage && (
            <p
              aria-live="polite"
              className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              role="status"
            >
              {resendMessage}
            </p>
          )}
          <FormErrorMessage className="mt-3" message={resendError || undefined} />
          <button
            className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            onClick={onShowLogin}
            type="button"
          >
            Aller à la connexion
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-xl">
      <form aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Créer un compte
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Inscription</h2>
          <p className="text-sm text-foreground-muted">
            Renseignez vos informations. Vous devrez ensuite vérifier votre adresse email.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={fieldErrors.firstName} htmlFor="signup-first-name" label="Prénom" required>
              <FormInput
                aria-describedby={fieldErrors.firstName ? "signup-first-name-error" : undefined}
                aria-invalid={Boolean(fieldErrors.firstName)}
                autoComplete="given-name"
                disabled={isSubmitting}
                id="signup-first-name"
                onChange={(event) => updateField("firstName", event.target.value)}
                required
                value={values.firstName}
              />
            </FormField>

            <FormField error={fieldErrors.lastName} htmlFor="signup-last-name" label="Nom" required>
              <FormInput
                aria-describedby={fieldErrors.lastName ? "signup-last-name-error" : undefined}
                aria-invalid={Boolean(fieldErrors.lastName)}
                autoComplete="family-name"
                disabled={isSubmitting}
                id="signup-last-name"
                onChange={(event) => updateField("lastName", event.target.value)}
                required
                value={values.lastName}
              />
            </FormField>
          </div>

          <FormField
            className="mt-4"
            error={fieldErrors.email}
            htmlFor="signup-email"
            label="Email"
            required
          >
            <FormInput
              aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              disabled={isSubmitting}
              id="signup-email"
              onChange={(event) => updateField("email", event.target.value)}
              required
              type="email"
              value={values.email}
            />
          </FormField>

          <FormField
            className="mt-4"
            error={fieldErrors.password}
            htmlFor="signup-password"
            label="Mot de passe"
            required
          >
            <FormInput
              aria-describedby={[
                "signup-password-requirements",
                fieldErrors.password ? "signup-password-error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-invalid={Boolean(fieldErrors.password)}
              autoComplete="new-password"
              disabled={isSubmitting}
              id="signup-password"
              maxLength={128}
              onChange={(event) => updateField("password", event.target.value)}
              required
              type="password"
              value={values.password}
            />
          </FormField>

          <ul
            className="mt-3 grid gap-1 text-xs text-foreground-muted sm:grid-cols-2"
            id="signup-password-requirements"
          >
            {PASSWORD_REQUIREMENTS.map((requirement) => (
              <li className="flex items-center gap-1.5" key={requirement}>
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {requirement}
              </li>
            ))}
          </ul>

          <FormField
            className="mt-4"
            error={fieldErrors.confirmPassword}
            htmlFor="signup-confirm-password"
            label="Confirmer le mot de passe"
            required
          >
            <FormInput
              aria-describedby={
                fieldErrors.confirmPassword ? "signup-confirm-password-error" : undefined
              }
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              autoComplete="new-password"
              disabled={isSubmitting}
              id="signup-confirm-password"
              maxLength={128}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              required
              type="password"
              value={values.confirmPassword}
            />
          </FormField>

          <FormErrorMessage className="mt-4" message={requestError || undefined} />

          <Button className="mt-5 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Inscription en cours..." : "Créer mon compte"}
          </Button>

          <p className="mt-5 text-center text-sm text-foreground-muted">
            Vous avez déjà un compte ?{" "}
            <button
              className="font-medium text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              onClick={onShowLogin}
              type="button"
            >
              Se connecter
            </button>
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
