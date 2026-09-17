"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { useUsers } from "@/src/contexts/UserContext";
import { PASSWORD_HINT, getPasswordPolicyError } from "@/src/lib/password-policy";


// Le backend incremente `authVersion` en changeant le mot de passe : la session
// courante est invalidee dans la foulee. Rester sur la page enverrait l'utilisateur
// dans une cascade de 401. On le previent et on le deconnecte proprement.
const LOGOUT_DELAY_MS = 2500;

export default function ChangePasswordForm() {
  const { changeMyPassword } = useUsers();
  const { logout } = useAuth();
  const fieldPrefix = useId();
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
      }
    },
    [],
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword) {
      setError("Renseigne ton mot de passe actuel et le nouveau.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Le nouveau mot de passe doit etre different de l'actuel.");
      return;
    }

    const policyError = getPasswordPolicyError(newPassword);

    if (policyError) {
      setError(policyError);
      return;
    }

    setIsSubmitting(true);

    try {
      await changeMyPassword({ currentPassword, newPassword });
      setMessage(
        "Mot de passe mis a jour. Vous allez etre deconnecte : reconnectez-vous avec le nouveau mot de passe.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logoutTimer.current = setTimeout(() => void logout(), LOGOUT_DELAY_MS);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de changer le mot de passe.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <FormField htmlFor={`${fieldPrefix}-current`} label="Mot de passe actuel" required>
        <FormInput
          autoComplete="current-password"
          id={`${fieldPrefix}-current`}
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </FormField>

      <FormField
        hint={PASSWORD_HINT}
        htmlFor={`${fieldPrefix}-new`}
        label="Nouveau mot de passe"
        required
      >
        <FormInput
          autoComplete="new-password"
          id={`${fieldPrefix}-new`}
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          value={newPassword}
        />
      </FormField>

      <FormField htmlFor={`${fieldPrefix}-confirm`} label="Confirmer le nouveau mot de passe" required>
        <FormInput
          autoComplete="new-password"
          id={`${fieldPrefix}-confirm`}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </FormField>

      <FormErrorMessage message={error} />

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <FormActions align="start">
        <Button disabled={isSubmitting || Boolean(message)} type="submit">
          {isSubmitting
            ? "Mise a jour..."
            : message
              ? "Deconnexion..."
              : "Changer le mot de passe"}
        </Button>
      </FormActions>
    </form>
  );
}
