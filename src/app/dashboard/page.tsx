"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileLoadError from "@/src/components/auth/ProfileLoadError";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";

export default function DashboardPage() {
  const {
    user,
    isAuthenticated,
    isAuthReady,
    loadProfile,
    profileError,
    sessionExpired,
  } = useAuth();
  const router = useRouter();
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isAuthenticated && !sessionExpired) {
      router.replace(LANDING_LOGIN_ROUTE);
      return;
    }

    if (user?.role) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthReady, isAuthenticated, user, router, sessionExpired]);

  const handleRetryProfile = async () => {
    setIsRetryingProfile(true);

    try {
      await loadProfile();
    } catch {
      // Le contexte conserve et affiche le message de profil approprié.
    } finally {
      setIsRetryingProfile(false);
    }
  };

  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-surface p-6 shadow-[var(--shadow-soft)]">
          <div className="h-2 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-2 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </main>
    );
  }

  if (isAuthenticated && !user && profileError) {
    return (
      <ProfileLoadError
        isRetrying={isRetryingProfile}
        message={profileError}
        onRetry={() => void handleRetryProfile()}
      />
    );
  }

  return null;
}
