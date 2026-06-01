"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { DashboardThemeProvider } from "@/src/contexts/DashboardThemeContext";
import Sidebar from "@/src/components/dashboard/Sidebar";
import Header from "@/src/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthenticated, isAuthReady, logout } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedPreference = localStorage.getItem("dashboard-dark-mode");
    if (storedPreference !== null) {
      setDarkMode(storedPreference === "true");
    }
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
    if (isAuthReady && !isAuthenticated) {
      router.push("/#landing-login");
    }
  }, [isAuthReady, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/#landing-login");
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
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        user={user}
        role={user.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />
      <DashboardThemeProvider
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode((current) => !current)}
      >
        <div className="relative flex min-h-screen flex-col md:pl-72">
          <Header
            user={user}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((current) => !current)}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
          />
          <main className="flex-1 bg-background px-4 pb-10 pt-6 text-foreground transition-colors duration-300 md:px-8">
            {children}
          </main>
        </div>
      </DashboardThemeProvider>
    </div>
  );
}
