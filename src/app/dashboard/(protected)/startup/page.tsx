"use client";

import Link from "next/link";
import RoleGuard from "@/src/components/auth/Roleguard";

export default function StartupDashboardPage() {
  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise rounded-2xl border border-border/75 bg-white/90 p-6 shadow-[var(--shadow-soft)]">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Startup Space
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Startup Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Manage your candidature from the My Applications section.
        </p>

        <Link
          className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95"
          href="/dashboard/startup/applications"
        >
          Open My Applications
        </Link>
      </section>
    </RoleGuard>
  );
}