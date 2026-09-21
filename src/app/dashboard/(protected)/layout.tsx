"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { DashboardThemeProvider } from "@/src/contexts/DashboardThemeContext";
import { StartupProvider } from "@/src/contexts/StartupContext";
import { ProgramProvider } from "@/src/contexts/ProgramContext";
import { ProgramEvaluatorProvider } from "@/src/contexts/ProgramEvaluatorContext";
import { ApplicationProvider } from "@/src/contexts/ApplicationContext";
import { ApplicationEvaluatorProvider } from "@/src/contexts/ApplicationEvaluatorContext";
import { EvaluationProvider } from "@/src/contexts/EvaluationContext";
import { IncubationFollowupsProvider } from "@/src/contexts/IncubationFollowupsContext";
import { NotificationProvider } from "@/src/contexts/NotificationContext";
import Sidebar from "@/src/components/dashboard/Sidebar";
import Header from "@/src/components/dashboard/Header";
import ProfileLoadError from "@/src/components/auth/ProfileLoadError";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";
import DashboardQueryProvider from "@/src/components/dashboard/DashboardQueryProvider";
import { useSidebarPreference } from "@/src/hooks/useSidebarPreference";

function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <DashboardQueryProvider>
      <StartupProvider>
        <ProgramProvider>
          <ProgramEvaluatorProvider>
            <ApplicationProvider>
              <ApplicationEvaluatorProvider>
                <EvaluationProvider>
                  <IncubationFollowupsProvider>
                    <NotificationProvider>{children}</NotificationProvider>
                  </IncubationFollowupsProvider>
                </EvaluationProvider>
              </ApplicationEvaluatorProvider>
            </ApplicationProvider>
          </ProgramEvaluatorProvider>
        </ProgramProvider>
      </StartupProvider>
    </DashboardQueryProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    isAuthenticated,
    isAuthReady,
    logout,
    loadProfile,
    profileError,
    sessionExpired,
  } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { collapsed, toggle: toggleSidebarCollapsed } = useSidebarPreference();
  const [darkMode, setDarkMode] = useState(false);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  useEffect(() => {
    const storedPreference = localStorage.getItem("dashboard-dark-mode");
    if (storedPreference === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDarkMode(storedPreference === "true");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.style.colorScheme = darkMode ? "dark" : "light";

    return () => {
      root.classList.remove("dark");
      root.style.colorScheme = "";
    };
  }, [darkMode]);

  useEffect(() => {
    if (isAuthReady && !isAuthenticated && !sessionExpired) {
      router.replace(LANDING_LOGIN_ROUTE);
    }
  }, [isAuthReady, isAuthenticated, router, sessionExpired]);

  const handleLogout = async () => {
    await logout();
    router.replace(LANDING_LOGIN_ROUTE);
  };

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
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-foreground-muted">
            Session
          </p>
          <div className="mt-4 h-2 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-2 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user || !user.role) {
    if (isAuthenticated && profileError) {
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

  return (
    <DashboardProviders>
      <div className="dashboard-shell min-h-screen bg-transparent" data-sidebar-collapsed={collapsed}>
        <Sidebar
          user={user}
          role={user.role}
          isOpen={isSidebarOpen}
          collapsed={collapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
        />
        <DashboardThemeProvider
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode((current) => !current)}
        >
          <div className="dashboard-main relative flex min-h-screen flex-col">
            <Header
              user={user}
              isSidebarOpen={isSidebarOpen}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((current) => !current)}
              onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            />
            <main className="dashboard-page flex-1 bg-background text-foreground">
              {children}
            </main>
          </div>
        </DashboardThemeProvider>
      </div>
    </DashboardProviders>
  );
}
