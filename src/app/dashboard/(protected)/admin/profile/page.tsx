"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import AccountSettings from "@/src/components/dashboard/account/AccountSettings";

export default function AdminAccountPage() {
  return (
    <RoleGuard allowedRole="ADMIN">
      <AccountSettings />
    </RoleGuard>
  );
}
