"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { FormErrorMessage } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useAuth } from "@/src/contexts/AuthContext";
import { ApiError } from "@/src/lib/api";
import {
  LANDING_LOGIN_ROUTE,
  LANDING_SIGNUP_ROUTE,
  type LandingAuthMode,
} from "@/src/lib/auth-routing";
import { getDashboardRoute } from "@/src/lib/routeDashboard";
import SignupForm from "@/src/components/auth/SignupForm";

const loginFeatures = [
  "Comites d evaluation multi-profils",
  "Workflow candidature-selection-incubation",
  "Pilotage data-driven pour decisions rapides",
];

type LandingLoginCardProps = {
  initialMode?: LandingAuthMode;
  sessionMessage?: string;
};

export default function LandingLoginCard({
  initialMode = "login",
  sessionMessage,
}: LandingLoginCardProps) {
  const { login, user, isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();
  const fieldIdPrefix = useId();

  const [mode, setMode] = useState<LandingAuthMode>(initialMode);
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
      if (reason instanceof ApiError) {
        setError(reason.message);
      } else {
        setError("Une erreur réseau est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailId = `${fieldIdPrefix}-email`;
  const passwordId = `${fieldIdPrefix}-password`;

  const selectMode = (nextMode: LandingAuthMode) => {
    setMode(nextMode);
    router.replace(
      nextMode === "signup" ? LANDING_SIGNUP_ROUTE : LANDING_LOGIN_ROUTE,
      { scroll: false },
    );
  };

  return (
    <div className="scroll-mt-24" id="landing-login">
      {mode === "signup" ? (
        <SignupForm onShowLogin={() => selectMode("login")} />
      ) : (
        <Card className="border-border/50 shadow-xl">
          <form aria-busy={isSubmitting} onSubmit={handleSubmit}>
            <CardHeader className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Espace securise
              </p>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Connexion
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acces direct selon votre role.
                </p>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground" htmlFor={emailId}>
                  Email
                </label>
                <Input
                  autoComplete="email"
                  className="bg-secondary/30"
                  disabled={isSubmitting}
                  id={emailId}
                  onChange={(inputEvent) => setEmail(inputEvent.target.value)}
                  placeholder="votre@email.com"
                  required
                  type="email"
                  value={email}
                />

                <label className="text-sm font-medium text-foreground" htmlFor={passwordId}>
                  Mot de passe
                </label>
                <Input
                  autoComplete="current-password"
                  className="bg-secondary/30"
                  disabled={isSubmitting}
                  id={passwordId}
                  onChange={(inputEvent) => setPassword(inputEvent.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  type="password"
                  value={password}
                />

                <p className="text-right">
                  <Link
                    className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    href="/forgot-password"
                  >
                    Mot de passe oublié ?
                  </Link>
                </p>
              </div>

              {sessionMessage && (
                <p
                  aria-live="assertive"
                  className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  role="alert"
                >
                  {sessionMessage}
                </p>
              )}

              <FormErrorMessage className="mt-4" message={error || undefined} />

              <Button className="mt-4 w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Connexion en cours..." : "Se connecter"}
              </Button>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <button
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => selectMode("signup")}
                  type="button"
                >
                  S’inscrire
                </button>
              </p>
            </CardContent>

            <CardFooter>
              <div className="space-y-2 border-t border-border pt-4">
                {loginFeatures.map((feature) => (
                  <div
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    key={feature}
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
