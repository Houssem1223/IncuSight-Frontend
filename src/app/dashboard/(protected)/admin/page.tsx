"use client";

import Link from "next/link";
import RoleGuard from "@/src/components/auth/Roleguard";

const monthlyPipeline = [
  { month: "Jan", count: 14 },
  { month: "Feb", count: 18 },
  { month: "Mar", count: 22 },
  { month: "Apr", count: 19 },
  { month: "May", count: 27 },
  { month: "Jun", count: 25 },
];

const roleDistribution = [
  { role: "STARTUP", share: 62, color: "bg-emerald-500" },
  { role: "EVALUATOR", share: 28, color: "bg-amber-500" },
  { role: "ADMIN", share: 10, color: "bg-sky-500" },
];

const maxMonthlyValue = Math.max(...monthlyPipeline.map((item) => item.count));

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRole="ADMIN">
      <section className="motion-rise rounded-2xl border border-border/75 bg-white/90 p-6 shadow-[var(--shadow-soft)]">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Admin Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Open Startups or Users sections to manage applications and accounts.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95"
            href="/dashboard/admin/startups"
          >
            Open Startups
          </Link>
          <Link
            className="inline-flex rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
            href="/dashboard/admin/users"
          >
            Open Users
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Applications</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">127</p>
            <p className="mt-1 text-xs text-emerald-700">+12% vs last month</p>
          </article>

          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Accepted Startups</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">34</p>
            <p className="mt-1 text-xs text-emerald-700">Conversion rate 26.7%</p>
          </article>

          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Avg Review Delay</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">2.8d</p>
            <p className="mt-1 text-xs text-amber-700">Target: below 3.0 days</p>
          </article>

          <article className="rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Active Accounts</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">91%</p>
            <p className="mt-1 text-xs text-emerald-700">Healthy engagement</p>
          </article>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-border/75 bg-white p-4">
            <h2 className="text-base font-semibold text-foreground">Monthly Intake Trend</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Static BI preview of startup pipeline evolution.
            </p>

            <div className="mt-4 space-y-3">
              {monthlyPipeline.map((item) => (
                <div key={item.month}>
                  <div className="flex items-center justify-between text-xs text-foreground-muted">
                    <span>{item.month}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(item.count / maxMonthlyValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border/75 bg-white p-4">
            <h2 className="text-base font-semibold text-foreground">Role Distribution</h2>
            <p className="mt-1 text-sm text-foreground-muted">Current platform population split.</p>

            <div className="mt-4 space-y-3">
              {roleDistribution.map((item) => (
                <div key={item.role} className="rounded-xl border border-border/70 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.role}</span>
                    <span className="text-foreground-muted">{item.share}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-border/75 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4">
          <h2 className="text-base font-semibold text-foreground">Static BI Insights</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <p className="rounded-xl border border-border/75 bg-white px-3 py-2 text-sm text-foreground-muted">
              Best evaluator throughput observed on Tuesday and Wednesday windows.
            </p>
            <p className="rounded-xl border border-border/75 bg-white px-3 py-2 text-sm text-foreground-muted">
              Most accepted dossiers come from fintech and climate-tech verticals.
            </p>
            <p className="rounded-xl border border-border/75 bg-white px-3 py-2 text-sm text-foreground-muted">
              Inactive account ratio improved after admin follow-up campaigns.
            </p>
          </div>
        </article>
      </section>
    </RoleGuard>
  );
}
