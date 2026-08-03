"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import {
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { Button, buttonVariants } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { clearSession } from "@/src/lib/api";
import {
  INVALID_RESET_LINK_MESSAGE,
  RESET_PASSWORD_REQUIREMENTS,
  RESET_PASSWORD_SUCCESS_MESSAGE,
  getResetPasswordErrorMessage,
  hasResetPasswordToken,
  requestResetPassword,
  validateResetPasswordForm,
  type ResetPasswordFieldErrors,
  type ResetPasswordFormValues,
} from "@/src/lib/password-recovery";

const initialValues: ResetPasswordFormValues = {
  newPassword: "",
  confirmPassword: "",
};

type ResetPasswordFormProps = {
  token?: string;
};

type PasswordVisibilityButtonProps = {
  isVisible: boolean;
  isDisabled: boolean;
  label: string;
  onToggle: () => void;
};

function PasswordVisibilityButton({
  isVisible,
  isDisabled,
  label,
  onToggle,
}: PasswordVisibilityButtonProps) {
  return (
    <button
      aria-label={`${isVisible ? "Masquer" : "Afficher"} ${label}`}
      aria-pressed={isVisible}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-foreground-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
      disabled={isDisabled}
      onClick={onToggle}
      type="button"
    >
      {isVisible ? (
        <EyeOff className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Eye className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [values, setValues] = useState<ResetPasswordFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!hasResetPasswordToken(token)) {
    return (
      <Card className="border-border/60 shadow-xl">
        <CardContent className="px-6 py-9 text-center">
          <div aria-live="assertive" role="alert">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <CircleAlert className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
              {INVALID_RESET_LINK_MESSAGE}
            </h1>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              Demandez un nouveau lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <Link className={buttonVariants({ className: "mt-7" })} href="/forgot-password">
            Demander un nouveau lien
          </Link>
        </CardContent>
      </Card>
    );
  }

  const updateField = (field: keyof ResetPasswordFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateResetPasswordForm(values);
    setFieldErrors(errors);
    setRequestError("");

    if (Object.keys(errors).length > 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await requestResetPassword(token, values.newPassword);
      clearSession("logout");
      setValues(initialValues);
      setIsSuccess(true);
    } catch (error: unknown) {
      setRequestError(getResetPasswordErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-border/60 shadow-xl">
        <CardContent className="px-6 py-9 text-center">
          <div aria-live="polite" role="status">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
              {RESET_PASSWORD_SUCCESS_MESSAGE}
            </h1>
            <p className="mt-3 text-sm leading-6 text-foreground-muted">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>

          <Link className={buttonVariants({ className: "mt-7" })} href="/login">
            Aller à la connexion
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-xl">
      <form aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
        <CardHeader className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand">
            <KeyRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Réinitialiser le mot de passe
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>
        </CardHeader>

        <CardContent>
          <FormField
            error={fieldErrors.newPassword}
            htmlFor="reset-new-password"
            label="Nouveau mot de passe"
            required
          >
            <div className="relative">
              <FormInput
                aria-describedby={[
                  "reset-password-requirements",
                  fieldErrors.newPassword ? "reset-new-password-error" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-invalid={Boolean(fieldErrors.newPassword)}
                autoComplete="new-password"
                className="pr-12"
                disabled={isSubmitting}
                id="reset-new-password"
                onChange={(event) => updateField("newPassword", event.target.value)}
                required
                type={showNewPassword ? "text" : "password"}
                value={values.newPassword}
              />
              <PasswordVisibilityButton
                isDisabled={isSubmitting}
                isVisible={showNewPassword}
                label="le nouveau mot de passe"
                onToggle={() => setShowNewPassword((current) => !current)}
              />
            </div>
          </FormField>

          <ul
            className="mt-3 grid gap-1 text-xs text-foreground-muted sm:grid-cols-2"
            id="reset-password-requirements"
          >
            {RESET_PASSWORD_REQUIREMENTS.map((requirement) => (
              <li className="flex items-center gap-1.5" key={requirement}>
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {requirement}
              </li>
            ))}
          </ul>

          <FormField
            className="mt-4"
            error={fieldErrors.confirmPassword}
            htmlFor="reset-confirm-password"
            label="Confirmation du mot de passe"
            required
          >
            <div className="relative">
              <FormInput
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? "reset-confirm-password-error"
                    : undefined
                }
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                autoComplete="new-password"
                className="pr-12"
                disabled={isSubmitting}
                id="reset-confirm-password"
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                required
                type={showConfirmation ? "text" : "password"}
                value={values.confirmPassword}
              />
              <PasswordVisibilityButton
                isDisabled={isSubmitting}
                isVisible={showConfirmation}
                label="la confirmation du mot de passe"
                onToggle={() => setShowConfirmation((current) => !current)}
              />
            </div>
          </FormField>

          <FormErrorMessage className="mt-4" message={requestError || undefined} />

          <Button className="mt-5 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Réinitialisation en cours..." : "Réinitialiser le mot de passe"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
