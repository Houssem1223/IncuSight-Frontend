"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import type { Notification } from "@/src/types/notification";

type NotificationsPanelProps = {
  title?: string;
  description?: string;
};

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

function getNotificationBadge(notification: Notification): string | null {
  if (typeof notification.type === "string" && notification.type.trim()) {
    return notification.type;
  }

  return null;
}

function isUnread(notification: Notification): boolean {
  return notification.isRead !== true;
}

export default function NotificationsPanel({
  title = "Notifications",
  description = "Dernieres notifications recues pour votre compte.",
}: NotificationsPanelProps) {
  const { user, isAuthReady, isAuthenticated } = useAuth();
  const {
    notifications,
    unreadCount,
    isNotificationsLoading,
    notificationsError,
    clearNotificationsError,
    fetchMyNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useNotifications();

  const [actionId, setActionId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const canShow = user?.role === "ADMIN" || user?.role === "EVALUATOR" || user?.role === "STARTUP";

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !canShow) {
      return;
    }

    clearNotificationsError();

    void Promise.all([fetchMyNotifications(), fetchUnreadCount()]).catch(() => {
    });
  }, [
    isAuthReady,
    isAuthenticated,
    canShow,
    clearNotificationsError,
    fetchMyNotifications,
    fetchUnreadCount,
  ]);

  const displayNotifications = useMemo(() => {
    const sorted = [...notifications].sort((left, right) => {
      const leftUnread = isUnread(left) ? 0 : 1;
      const rightUnread = isUnread(right) ? 0 : 1;

      if (leftUnread !== rightUnread) {
        return leftUnread - rightUnread;
      }

      const leftDate = new Date(left.createdAt || 0).getTime();
      const rightDate = new Date(right.createdAt || 0).getTime();

      return rightDate - leftDate;
    });

    return sorted;
  }, [notifications]);

  const handleMarkAsRead = async (id: string) => {
    setActionId(id);

    try {
      await markNotificationAsRead(id);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionId(id);

    try {
      await deleteNotification(id);
    } finally {
      setActionId(null);
    }
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);

    try {
      await markAllNotificationsAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (!canShow) {
    return null;
  }

  return (
    <section className="motion-rise dashboard-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
            Centre
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground">
            {unreadCount} non lues
          </span>
          <button
            className="dashboard-btn rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:border-brand/35"
            disabled={isNotificationsLoading}
            onClick={() => void Promise.all([fetchMyNotifications(), fetchUnreadCount()])}
            type="button"
          >
            Rafraichir
          </button>
          <button
            className="dashboard-btn rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:border-brand/35"
            disabled={isNotificationsLoading || isMarkingAll || unreadCount === 0}
            onClick={() => void handleMarkAll()}
            type="button"
          >
            Tout marquer lu
          </button>
        </div>
      </div>

      {notificationsError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {notificationsError}
        </p>
      )}

      {isNotificationsLoading && displayNotifications.length === 0 && (
        <div className="mt-4 space-y-2">
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {!isNotificationsLoading && displayNotifications.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/80 bg-white px-3 py-3 text-sm text-foreground-muted">
          Aucune notification pour le moment.
        </p>
      )}

      {displayNotifications.length > 0 && (
        <ul className="mt-5 space-y-3">
          {displayNotifications.map((notification) => {
            const badge = getNotificationBadge(notification);
            const message = getNotificationMessage(notification);
            const unread = isUnread(notification);
            const isBusy = actionId === notification.id || isNotificationsLoading;

            return (
              <li
                key={notification.id}
                className={`rounded-2xl border px-4 py-3 shadow-[var(--shadow-soft)] transition ${
                  unread
                    ? "border-amber-200 bg-amber-50/70"
                    : "border-border/70 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {getNotificationTitle(notification)}
                    </p>
                    {message && (
                      <p className="mt-1 text-sm text-foreground-muted">{message}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
                      {badge && (
                        <span className="rounded-full border border-border px-2 py-0.5">
                          {badge}
                        </span>
                      )}
                      <span>{formatDate(notification.createdAt)}</span>
                      {unread && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                          Non lu
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {unread && (
                      <button
                        className="dashboard-btn rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:border-brand/35"
                        disabled={isBusy}
                        onClick={() => void handleMarkAsRead(notification.id)}
                        type="button"
                      >
                        Marquer lu
                      </button>
                    )}
                    <button
                      className="dashboard-btn rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:border-brand/35"
                      disabled={isBusy}
                      onClick={() => void handleDelete(notification.id)}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
