"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";

export default function LandingLoginCard() {
  const { login, user, isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();
  const fieldIdPrefix = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (isAuthenticated && user?.role) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthReady, isAuthenticated, user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (reason: unknown) {
      if (reason instanceof Error) {
        setError(reason.message);
      } else {
        setError("Connexion impossible");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailId = `${fieldIdPrefix}-email`;
  const passwordId = `${fieldIdPrefix}-password`;

  return (
    <form
      className="rounded-2xl border border-border/75 bg-white p-4 md:p-5"
      id="landing-login"
      onSubmit={handleSubmit}
    >
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">Espace securise</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Connexion</h2>
      <p className="mt-1 text-sm text-foreground-muted">Acces direct selon votre role.</p>

      <div className="mt-5 space-y-4">
        <FormField htmlFor={emailId} label="Email" required>
          <FormInput
            autoComplete="email"
            disabled={isSubmitting}
            id={emailId}
            onChange={(inputEvent) => setEmail(inputEvent.target.value)}
            placeholder="nom@entreprise.com"
            required
            type="email"
            value={email}
          />
        </FormField>

        <FormField htmlFor={passwordId} label="Mot de passe" required>
          <FormInput
            autoComplete="current-password"
            disabled={isSubmitting}
            id={passwordId}
            onChange={(inputEvent) => setPassword(inputEvent.target.value)}
            placeholder="Votre mot de passe"
            required
            type="password"
            value={password}
          />
        </FormField>
      </div>

      <FormErrorMessage className="mt-4" message={error || undefined} />

      <FormActions align="start" className="mt-5">
        <button
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-brand-contrast shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Connexion en cours..." : "Se connecter"}
        </button>
      </FormActions>
    </form>
  );
}
