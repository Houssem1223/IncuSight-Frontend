"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRole: "ADMIN" | "STARTUP" | "EVALUATOR";
  children: React.ReactNode;
};

export default function RoleGuard({
  allowedRole,
  children,
}: RoleGuardProps) {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.role && user.role !== allowedRole) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthReady, isAuthenticated, user, allowedRole, router]);

  if (!isAuthReady) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow-soft)]">
        <div className="h-2 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-2 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}