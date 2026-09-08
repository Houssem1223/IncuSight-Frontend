import { Suspense } from "react";
import AdminApplicationsManagement from "@/src/components/dashboard/admin/AdminApplicationsManagement";

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminApplicationsManagement />
    </Suspense>
  );
}
