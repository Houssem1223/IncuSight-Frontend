import { Suspense } from "react";
import AdminDashboardOverview from "@/src/components/dashboard/admin/AdminDashboardOverview";

function AdminDashboardOverviewFallback() {
  return (
    <div className="space-y-8">
      <div className="dashboard-surface h-20 animate-pulse rounded-2xl bg-slate-100 p-4" />
      {/* Meme grille et memes hauteurs que le squelette d'OverviewKpiCards : une
          grille `grid-cols-4` fixe ne se repliait jamais sous 640 px et faisait
          sauter la mise en page a l'arrivee des donnees. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
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
