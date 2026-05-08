"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import NotificationsPanel from "@/src/components/dashboard/NotificationsPanel";

export default function EvaluatorNotificationsPage() {
  return (
    <RoleGuard allowedRole="EVALUATOR">
      <NotificationsPanel
        title="Notifications"
        description="Liste complete des notifications evaluateur."
      />
    </RoleGuard>
  );
}
