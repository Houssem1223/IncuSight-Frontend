
"use client";

import RoleGuard from "@/src/components/auth/Roleguard";

export default function AdminDashboardPage() {
  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-4 text-gray-600">
          Welcome to the admin area of IncuSight.
        </p>
      </div>
    </RoleGuard>
  );
}