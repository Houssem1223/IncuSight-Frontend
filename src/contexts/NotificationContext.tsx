"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import type { Notification } from "@/src/types/notification";

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  isNotificationsLoading: boolean;
  notificationsError: string | null;
  clearNotificationsError: () => void;
  fetchMyNotifications: () => Promise<Notification[]>;
  fetchUnreadCount: () => Promise<number>;
  markNotificationAsRead: (id: string) => Promise<number>;
  markAllNotificationsAsRead: () => Promise<number>;
  deleteNotification: (id: string) => Promise<number>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function toRecord(candidate: unknown): Record<string, unknown> | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate as Record<string, unknown>;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toNotification(candidate: unknown): Notification | null {
  const record = toRecord(candidate);

  if (!record) {
    return null;
  }

  const id = toString(record.id);

  if (!id) {
    return null;
  }

  const dataValue = record.data;
  const data = dataValue && typeof dataValue === "object" ? (dataValue as Record<string, unknown>) : undefined;

  return {
    id,
    userId: toString(record.userId),
    title: toString(record.title),
    message: toString(record.message),
    type: toString(record.type),
    isRead: toOptionalBoolean(record.isRead),
    readAt: toString(record.readAt) ?? null,
    createdAt: toString(record.createdAt),
    updatedAt: toString(record.updatedAt),
    applicationId: toString(record.applicationId),
    programId: toString(record.programId),
    evaluationId: toString(record.evaluationId),
    decisionId: toString(record.decisionId),
    data,
  };
}

function dedupeNotifications(notifications: Notification[]): Notification[] {
  const map = new Map<string, Notification>();

  for (const notification of notifications) {
    if (!map.has(notification.id)) {
      map.set(notification.id, notification);
    }
  }

  return [...map.values()];
}

function extractNotificationsFromResponse(payload: unknown): Notification[] {
  if (Array.isArray(payload)) {
    const notifications = payload
      .map((item) => {
        const directNotification = toNotification(item);

        if (directNotification) {
          return directNotification;
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const itemRecord = item as Record<string, unknown>;

        return toNotification(itemRecord.notification) || toNotification(itemRecord.data);
      })
      .filter((notification): notification is Notification => Boolean(notification));

    return dedupeNotifications(notifications);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;

    const directNotification = toNotification(objectPayload);

    if (directNotification) {
      return [directNotification];
    }

    const nestedKeys = ["notifications", "data", "items", "results"];

    for (const key of nestedKeys) {
      const nested = objectPayload[key];

      if (nested === undefined) {
        continue;
      }

      const nestedNotifications = extractNotificationsFromResponse(nested);

      if (nestedNotifications.length > 0) {
        return nestedNotifications;
      }
    }
  }

  return [];
}

function extractSingleNotificationFromResponse(payload: unknown): Notification | null {
  const notifications = extractNotificationsFromResponse(payload);
  return notifications[0] ?? null;
}

function extractCountFromResponse(payload: unknown): number {
  const directNumber = toOptionalNumber(payload);

  if (directNumber !== undefined) {
    return directNumber;
  }

  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const record = payload as Record<string, unknown>;
  const countKeys = ["count", "unreadCount", "unread", "total", "value"];

  for (const key of countKeys) {
    const candidate = record[key];
    const numeric = toOptionalNumber(candidate);

    if (numeric !== undefined) {
      return numeric;
    }
  }

  const nestedKeys = ["data", "result", "payload"];

  for (const key of nestedKeys) {
    const nested = record[key];

    if (nested === undefined) {
      continue;
    }

    const nestedCount = extractCountFromResponse(nested);

    if (nestedCount > 0) {
      return nestedCount;
    }
  }

  return 0;
}

function countUnreadNotifications(notifications: Notification[]): number | null {
  if (notifications.length === 0) {
    return 0;
  }

  let hasReadInfo = false;
  let unread = 0;

  for (const notification of notifications) {
    if (typeof notification.isRead === "boolean") {
      hasReadInfo = true;

      if (!notification.isRead) {
        unread += 1;
      }
    }
  }

  return hasReadInfo ? unread : null;
}

function upsertNotification(notifications: Notification[], incoming: Notification): Notification[] {
  const index = notifications.findIndex((notification) => notification.id === incoming.id);

  if (index === -1) {
    return [incoming, ...notifications];
  }

  const next = [...notifications];
  next[index] = {
    ...next[index],
    ...incoming,
  };
  return next;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const isNotificationsLoading = pendingRequests > 0;

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsError(null);
  }, [token]);

  const clearNotificationsError = useCallback(() => {
    setNotificationsError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const withLoading = useCallback(async <T,>(operation: () => Promise<T>) => {
    setPendingRequests((current) => current + 1);

    try {
      return await operation();
    } finally {
      setPendingRequests((current) => Math.max(0, current - 1));
    }
  }, []);

  const syncUnreadCount = useCallback((nextNotifications: Notification[]) => {
    const count = countUnreadNotifications(nextNotifications);

    if (count !== null) {
      setUnreadCount(count);
    }
  }, []);

  const applyNotificationsUpdate = useCallback(
    (updater: (current: Notification[]) => Notification[]) => {
      setNotifications((current) => {
        const next = updater(current);
        syncUnreadCount(next);
        return next;
      });
    },
    [syncUnreadCount],
  );

  const fetchMyNotifications = useCallback(async () => {
    return withLoading(async () => {
      setNotificationsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>("notifications", {}, authToken);
        const list = extractNotificationsFromResponse(response);
        setNotifications(list);
        syncUnreadCount(list);
        return list;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch notifications";
        setNotificationsError(message);
        throw error;
      }
    });
  }, [getRequiredToken, syncUnreadCount, withLoading]);

  const fetchUnreadCount = useCallback(async () => {
    return withLoading(async () => {
      setNotificationsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>("notifications/unread-count", {}, authToken);
        const count = extractCountFromResponse(response);
        setUnreadCount(count);
        return count;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch unread count";
        setNotificationsError(message);
        throw error;
      }
    });
  }, [getRequiredToken, withLoading]);

  const pollUnreadCount = useCallback(
    () => fetchUnreadCount().catch(() => {}),
    [fetchUnreadCount],
  );

  useAutoRefresh(pollUnreadCount, {
    enabled: Boolean(token),
    intervalMs: 30000,
  });

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      return withLoading(async () => {
        setNotificationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `notifications/${id}/read`,
            {
              method: "PATCH",
            },
            authToken,
          );

          const updated = extractSingleNotificationFromResponse(response);

          if (updated) {
            applyNotificationsUpdate((current) => upsertNotification(current, updated));
          } else {
            const now = new Date().toISOString();

            applyNotificationsUpdate((current) =>
              current.map((notification) =>
                notification.id === id
                  ? {
                      ...notification,
                      isRead: true,
                      readAt: notification.readAt ?? now,
                    }
                  : notification,
              ),
            );
          }

          return extractCountFromResponse(response);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to mark notification";
          setNotificationsError(message);
          throw error;
        }
      });
    },
    [applyNotificationsUpdate, getRequiredToken, withLoading],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    return withLoading(async () => {
      setNotificationsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>(
          "notifications/read-all",
          {
            method: "PATCH",
          },
          authToken,
        );

        const now = new Date().toISOString();
        applyNotificationsUpdate((current) =>
          current.map((notification) => ({
            ...notification,
            isRead: true,
            readAt: notification.readAt ?? now,
          })),
        );

        setUnreadCount(0);
        return extractCountFromResponse(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to mark notifications";
        setNotificationsError(message);
        throw error;
      }
    });
  }, [applyNotificationsUpdate, getRequiredToken, withLoading]);

  const deleteNotification = useCallback(
    async (id: string) => {
      return withLoading(async () => {
        setNotificationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `notifications/${id}`,
            {
              method: "DELETE",
            },
            authToken,
          );

          applyNotificationsUpdate((current) =>
            current.filter((notification) => notification.id !== id),
          );

          return extractCountFromResponse(response);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to delete notification";
          setNotificationsError(message);
          throw error;
        }
      });
    },
    [applyNotificationsUpdate, getRequiredToken, withLoading],
  );

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }

  return context;
}
