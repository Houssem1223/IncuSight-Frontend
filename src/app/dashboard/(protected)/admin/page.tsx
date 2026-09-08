import { Suspense } from "react";
import AdminDashboardOverview from "@/src/components/dashboard/admin/AdminDashboardOverview";

function AdminDashboardOverviewFallback() {
  return (
    <div className="space-y-8">
      <div className="dashboard-surface h-20 animate-pulse rounded-2xl bg-slate-100 p-4" />
      <div className="grid grid-cols-4 gap-4">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardOverviewFallback />}>
      <AdminDashboardOverview />
    </Suspense>
  );
}
