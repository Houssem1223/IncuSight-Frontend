"use client";

import RoleGuard from "@/src/components/auth/Roleguard";
import AdminStartupsList from "@/src/components/dashboard/AdminStartupsList";

export default function AdminStartupsPage() {
  return (
    <RoleGuard allowedRole="ADMIN">
      <AdminStartupsList />
    </RoleGuard>
  );
}
