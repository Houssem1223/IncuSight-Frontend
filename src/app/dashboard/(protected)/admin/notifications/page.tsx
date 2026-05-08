"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import NotificationsPanel from "@/src/components/dashboard/NotificationsPanel";

export default function AdminNotificationsPage() {
  return (
    <RoleGuard allowedRole="ADMIN">
      <NotificationsPanel
        title="Notifications"
        description="Liste complete des notifications admin."
      />
    </RoleGuard>
  );
}
