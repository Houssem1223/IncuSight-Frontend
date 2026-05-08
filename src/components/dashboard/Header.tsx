"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { User } from "@/src/types/auth";
import type { Notification } from "@/src/types/notification";

interface HeaderProps {
  user: User;
  onLogout: () => Promise<void>;
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
  onLogout,
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
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const canShowNotifications = user.role === "ADMIN" || user.role === "EVALUATOR";
  const notificationsHref =
    user.role === "ADMIN" ? "/dashboard/admin/notifications" : "/dashboard/evaluateur/notifications";
  const pathname = usePathname();

  useEffect(() => {
    if (!canShowNotifications) {
      return;
    }

    void fetchUnreadCount();
  }, [canShowNotifications, fetchUnreadCount]);

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
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsNotificationsOpen(false);
    setActiveNotification(null);
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

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-gradient-to-r from-white/92 via-surface to-orange-50/40 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open sidebar"
            className="dashboard-btn inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm hover:border-brand/50 md:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <span className="font-mono text-lg leading-none">=</span>
          </button>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              IncuSight Dashboard
            </h1>
            <p className="text-sm text-foreground-muted">
              Espace MEDIANET Incubateur - Bienvenue {user.firstName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canShowNotifications && (
            <div className="relative" ref={notificationsRef}>
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
                className="dashboard-btn relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm hover:border-brand/40"
                onClick={handleToggleNotifications}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/80 bg-white p-4 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground-muted">
                        {unreadCount} non lues
                      </span>
                      <Link
                        className="text-[11px] font-semibold text-brand-strong hover:underline"
                        href={notificationsHref}
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                        Voir tout
                      </Link>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-foreground-muted">Apercu rapide</p>

                  {isNotificationsLoading && recentNotifications.length === 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </div>
                  )}

                  {!isNotificationsLoading && recentNotifications.length === 0 && (
                    <p className="mt-3 text-sm text-foreground-muted">
                      Aucune notification.
                    </p>
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
                              unread ? "border-amber-200 bg-amber-50/70" : "border-border/70"
                            }`}
                          >
                            <button
                              className="w-full rounded-xl px-3 py-2 text-left hover:bg-white"
                              onClick={() => handleOpenNotification(notification)}
                              type="button"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {getNotificationTitle(notification)}
                              </p>
                              {message && (
                                <p className="mt-1 text-xs text-foreground-muted">{message}</p>
                              )}
                              <div className="mt-2 text-[11px] text-foreground-muted">
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
            className="dashboard-btn rounded-xl border border-warning/20 bg-warning px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-95"
            onClick={() => void onLogout()}
            type="button"
          >
            Logout
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
                className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-brand-strong">
                      Notification
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">
                      {getNotificationTitle(activeNotification)}
                    </h3>
                  </div>

                  <button
                    className="dashboard-btn rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:border-brand/35"
                    onClick={handleCloseNotification}
                    type="button"
                  >
                    Fermer
                  </button>
                </div>

                {getNotificationMessage(activeNotification) && (
                  <p className="mt-3 text-sm text-foreground-muted">
                    {getNotificationMessage(activeNotification)}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                  {activeType && (
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {activeType}
                    </span>
                  )}
                  <span>{formatDate(activeNotification.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
