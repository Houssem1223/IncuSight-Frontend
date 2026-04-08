"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";

export default function LoginPage() {
  const { login, user, isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        return;
      }

      setError("Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_6%_4%,rgba(245,158,11,0.15)_0,transparent_28%),radial-gradient(circle_at_92%_12%,rgba(15,118,110,0.18)_0,transparent_30%)]" />

      <section className="motion-rise mx-auto grid w-full max-w-5xl gap-6 rounded-[28px] border border-border/80 bg-surface/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <aside className="hidden rounded-2xl border border-brand/15 bg-gradient-to-br from-surface-strong via-white to-surface p-6 md:flex md:flex-col md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-strong">
              Medianet Incubator
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
              Connecte-toi pour reprendre ton espace de travail.
            </h1>
            <p className="mt-4 text-sm text-foreground-muted">
              Gère les évaluations, le suivi des startups et les décisions sur
              une interface unifiée.
            </p>
          </div>

          <ul className="mt-8 space-y-3 rounded-xl border border-border/70 bg-white/80 p-4 text-sm text-foreground-muted">
            <li>Vue centralisée des candidatures incubées.</li>
            <li>Navigation adaptée automatiquement à ton profil.</li>
            <li>Session sécurisée gérée par authentification.</li>
          </ul>
        </aside>

        <form
          className="rounded-2xl border border-border/70 bg-white p-6 md:p-8"
          onSubmit={handleSubmit}
        >
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-strong">
            IncuSight
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Tu seras redirigé automatiquement selon ton rôle.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground-muted">
                Email
              </span>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isSubmitting}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground-muted">
                Password
              </span>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isSubmitting}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
                type="password"
                value={password}
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-brand-contrast shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}