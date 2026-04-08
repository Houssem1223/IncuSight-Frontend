"use client";

import RoleGuard from "@/src/components/auth/Roleguard";

export default function StartupDashboardPage() {
  return (
    <RoleGuard allowedRole="STARTUP">
      <h1 className="text-3xl font-bold">Startup Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Welcome to the startup area of IncuSight.
      </p>
   
    </RoleGuard>
  );
}