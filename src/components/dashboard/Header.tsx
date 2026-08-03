"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Globe, Moon, Sparkles, Sun } from "lucide-react";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { User } from "@/src/types/auth";
import type { Notification } from "@/src/types/notification";

interface HeaderProps {
  user: User;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleSidebar: () => void;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNotificationTitle(notification: Notification): string {
  return notification.title || notification.type || "Notification";
}

function getNotificationMessage(notification: Notification): string | null {
  if (typeof notification.message === "string" && notification.message.trim()) {
    return notification.message;
  }

  return null;
}


export default function Header({
  user,
  darkMode,
  onToggleDarkMode,
  onToggleSidebar,
}: HeaderProps) {
  const {
    notifications,
    unreadCount,
    isNotificationsLoading,
    fetchMyNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
  } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const canShowNotifications = user.role === "ADMIN" || user.role === "EVALUATOR" || user.role === "STARTUP";
  const notificationsHref =
    user.role === "ADMIN"
      ? "/dashboard/admin/notifications"
      : user.role === "EVALUATOR"
        ? "/dashboard/evaluateur/notifications"
        : "/dashboard/startup/notifications";
  const pathname = usePathname();

  useEffect(() => {
    if (!canShowNotifications) {
      return;
    }

    void fetchUnreadCount();
    const intervalId = window.setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canShowNotifications, fetchUnreadCount]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationsRef.current) {
        return;
      }

      if (notificationsRef.current.contains(event.target as Node)) {
        return;
      }

      setIsNotificationsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsNotificationsOpen(false);
      setActiveNotification(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!activeNotification) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeNotification]);

  const recentNotifications = useMemo(() => {
    const sorted = [...notifications].sort((left, right) => {
      const leftUnread = left.isRead ? 1 : 0;
      const rightUnread = right.isRead ? 1 : 0;

      if (leftUnread !== rightUnread) {
        return leftUnread - rightUnread;
      }

      const leftDate = new Date(left.createdAt || 0).getTime();
      const rightDate = new Date(right.createdAt || 0).getTime();

      return rightDate - leftDate;
    });

    return sorted.slice(0, 5);
  }, [notifications]);

  const handleToggleNotifications = () => {
    if (!canShowNotifications) {
      return;
    }

    setIsNotificationsOpen((current) => !current);

    if (notifications.length === 0) {
      void fetchMyNotifications();
    }

    void fetchUnreadCount();
  };

  const handleOpenNotification = (notification: Notification) => {
    setActiveNotification(
      notification.isRead === true ? notification : { ...notification, isRead: true },
    );
    setIsNotificationsOpen(false);

    if (notification.isRead === true) {
      return;
    }

    void markNotificationAsRead(notification.id).then(() => {
      void fetchUnreadCount();
    });
  };

  const handleCloseNotification = () => {
    setActiveNotification(null);
  };

  const activeType = useMemo(
    () => (activeNotification?.type ? activeNotification.type : null),
    [activeNotification],
  );

  const pageTitle = useMemo(() => {
    const routes: Record<string, string> = {
      "/dashboard/admin": "Tableau de bord",
      "/dashboard/admin/notifications": "Notifications",
      "/dashboard/admin/startups": "Startups",
      "/dashboard/admin/users": "Utilisateurs",
      "/dashboard/admin/program": "Programmes",
      "/dashboard/admin/applications": "Candidatures",
      "/dashboard/admin/application-evaluators": "Affectation evaluateurs",
      "/dashboard/admin/application-evaluations": "Synthese reviews",
      "/dashboard/admin/incubation-followups": "Suivi incubation",
      "/dashboard/startup/incubation-followups": "Suivi incubation",
    };

    return routes[pathname] ?? "Tableau de bord";
  }, [pathname]);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "full",
      }).format(currentTime),
    [currentTime],
  );

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        timeStyle: "medium",
      }).format(currentTime),
    [currentTime],
  );

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-colors duration-300 ${
        darkMode
          ? "border-slate-800 bg-slate-900/80"
          : "border-slate-200 bg-white/80"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open sidebar"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-lg shadow-sm md:hidden ${
              darkMode
                ? "border-slate-700 bg-slate-800 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
            onClick={onToggleSidebar}
            type="button"
          >
            <span className="font-mono leading-none">=</span>
          </button>

          <div>
            <div className={`flex items-center gap-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              <Globe className="h-4 w-4" />
              <span className="font-medium">{formattedDate}</span>
              <span className={darkMode ? "text-slate-600" : "text-slate-300"}>|</span>
              <span className="font-mono font-semibold text-orange-500">{formattedTime}</span>
            </div>
            <h1 className={`mt-1 text-2xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              darkMode
                ? "border-slate-700 bg-slate-800 text-orange-300"
                : "border-slate-200 bg-white text-slate-600"
            }`}
            onClick={onToggleDarkMode}
            type="button"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {canShowNotifications && (
            <div className="relative" ref={notificationsRef}>
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
                onClick={handleToggleNotifications}
                type="button"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  className={`absolute right-0 mt-3 w-80 rounded-2xl border p-4 shadow-[var(--shadow-soft)] ${
                    darkMode
                      ? "border-slate-700 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Notifications</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">
                        {unreadCount} non lues
                      </span>
                      <Link
                        className="text-[11px] font-semibold text-orange-400 hover:underline"
                        href={notificationsHref}
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                        Voir tout
                      </Link>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">Apercu rapide</p>

                  {isNotificationsLoading && recentNotifications.length === 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-700" />
                      <div className="h-8 animate-pulse rounded-lg bg-slate-700" />
                    </div>
                  )}

                  {!isNotificationsLoading && recentNotifications.length === 0 && (
                    <p className="mt-3 text-sm text-slate-400">Aucune notification.</p>
                  )}

                  {recentNotifications.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {recentNotifications.map((notification) => {
                        const message = getNotificationMessage(notification);
                        const unread = notification.isRead !== true;

                        return (
                          <li
                            key={notification.id}
                            className={`rounded-xl border text-xs transition ${
                              unread
                                ? "border-amber-400/30 bg-amber-500/10"
                                : "border-slate-700"
                            }`}
                          >
                            <button
                              className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-700/40"
                              onClick={() => handleOpenNotification(notification)}
                              type="button"
                            >
                              <p className="text-sm font-semibold">
                                {getNotificationTitle(notification)}
                              </p>
                              {message && (
                                <p className="mt-1 text-xs text-slate-300">{message}</p>
                              )}
                              <div className="mt-2 text-[11px] text-slate-400">
                                {formatDate(notification.createdAt)}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            Actions rapides
          </button>
        </div>
      </div>

      {isMounted &&
        activeNotification &&
        createPortal(
          <div
            aria-modal="true"
            className="fixed inset-0 z-[100]"
            onClick={handleCloseNotification}
            role="dialog"
          >
            <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-md" />
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4 md:p-8">
              <div
                className={`w-full max-w-lg rounded-2xl border p-5 shadow-[var(--shadow-soft)] ${
                  darkMode
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-orange-400">
                      Notification
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {getNotificationTitle(activeNotification)}
                    </h3>
                  </div>

                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      darkMode
                        ? "border-slate-700 bg-slate-700 text-white"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                    onClick={handleCloseNotification}
                    type="button"
                  >
                    Fermer
                  </button>
                </div>

                {getNotificationMessage(activeNotification) && (
                  <p className={`mt-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-500"}`}>
                    {getNotificationMessage(activeNotification)}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                  {activeType && (
                    <span className={`rounded-full border px-2 py-0.5 ${
                      darkMode ? "border-slate-600 text-slate-300" : "border-slate-200 text-slate-500"
                    }`}>
                      {activeType}
                    </span>
                  )}
                  <span className={darkMode ? "text-slate-400" : "text-slate-500"}>
                    {formatDate(activeNotification.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
