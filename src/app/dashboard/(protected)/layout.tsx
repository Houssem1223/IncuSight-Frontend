"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
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

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthReady, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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
    <div className="min-h-screen bg-transparent md:grid md:grid-cols-[18rem_1fr]">
      <Sidebar
        role={user.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="relative flex min-h-screen flex-col">
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
        />
        <main className="px-4 pb-8 pt-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
