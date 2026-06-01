"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import NotificationsPanel from "@/src/components/dashboard/NotificationsPanel";

export default function StartupNotificationsPage() {
  return (
    <RoleGuard allowedRole="STARTUP">
      <NotificationsPanel
        title="Notifications"
        description="Liste complete des notifications pour votre startup."
      />
    </RoleGuard>
  );
}
