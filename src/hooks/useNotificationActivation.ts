"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { resolveNotificationHref } from "@/src/components/dashboard/notificationLinks";
import type { Notification } from "@/src/types/notification";

type ActivateOptions = {
  /** Appele avant la navigation (fermer le menu deroulant, par exemple). */
  onBeforeNavigate?: () => void;
};

/**
 * Ouvrir une notification, ou qu'elle soit affichee (menu du header, page
 * Notifications) : marquer lue, puis aller a la ressource concernee.
 *
 * - Destination : `resolveNotificationHref`, seul mapping type/ids -> route.
 *   Sans cible, la notification est marquee lue sans navigation arbitraire.
 * - Marquage optimiste (NotificationContext) : compteur et apparence changent
 *   immediatement ; un echec serveur n'empeche pas la navigation.
 * - Une seule activation a la fois : un double clic ne declenche ni deux
 *   appels ni deux navigations.
 */
export function useNotificationActivation() {
  const { user } = useAuth();
  const { markNotificationAsRead } = useNotifications();
  const router = useRouter();
  const processingRef = useRef<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const activate = useCallback(
    (notification: Notification, options: ActivateOptions = {}) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = notification.id;
      setProcessingId(notification.id);

      const release = () => {
        processingRef.current = null;
        setProcessingId(null);
      };

      const href = resolveNotificationHref(notification, user?.role);
      const pending =
        notification.isRead === true
          ? Promise.resolve()
          : // L'erreur est deja exposee par le contexte (notificationsError) et
            // l'etat restaure : elle ne doit ni bloquer ni remonter ici.
            markNotificationAsRead(notification.id).then(
              () => undefined,
              () => undefined,
            );

      options.onBeforeNavigate?.();

      if (href) {
        router.push(href);
      }

      void pending.finally(release);
    },
    [markNotificationAsRead, router, user?.role],
  );

  return { activate, processingId };
}
