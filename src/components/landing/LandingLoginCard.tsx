"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { FormErrorMessage } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";

const loginFeatures = [
  "Comites d evaluation multi-profils",
  "Workflow candidature-selection-incubation",
  "Pilotage data-driven pour decisions rapides",
];

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
    <Card className="border-border/50 shadow-xl" id="landing-login">
      <form onSubmit={handleSubmit}>
        <CardHeader className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Espace securise</p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Connexion</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acces direct selon votre role.</p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground" htmlFor={emailId}>
              Email
            </label>
            <Input
              autoComplete="email"
              disabled={isSubmitting}
              id={emailId}
              onChange={(inputEvent) => setEmail(inputEvent.target.value)}
              placeholder="votre@email.com"
              required
              type="email"
              className="bg-secondary/30"
              value={email}
            />

            <label className="text-sm font-medium text-foreground" htmlFor={passwordId}>
              Mot de passe
            </label>
            <Input
              autoComplete="current-password"
              disabled={isSubmitting}
              id={passwordId}
              onChange={(inputEvent) => setPassword(inputEvent.target.value)}
              placeholder="Votre mot de passe"
              required
              type="password"
              className="bg-secondary/30"
              value={password}
            />
          </div>

          <FormErrorMessage className="mt-4" message={error || undefined} />

          <Button className="mt-4 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </CardContent>

        <CardFooter>
          <div className="space-y-2 border-t border-border pt-4">
            {loginFeatures.map((feature) => (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" key={feature}>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
