"use client";

import RoleGuard from "@/src/components/auth/Roleguard";

export default function EvaluatorDashboardPage() {
  return (
    <RoleGuard allowedRole="EVALUATOR">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Evaluation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Evaluator Dashboard
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Review assigned applications, prioritize dossiers, and track recommendation quality.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Pending Reviews</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">12</p>
            <p className="mt-1 text-xs text-amber-700">Focus on this week submissions</p>
          </article>

          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Completed</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">38</p>
            <p className="mt-1 text-xs text-emerald-700">+6 since Monday</p>
          </article>

          <article className="dashboard-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Average Delay</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">2.3d</p>
            <p className="mt-1 text-xs text-foreground-muted">Target below 3 days</p>
          </article>
        </div>
      </section>
    </RoleGuard>
  );
}