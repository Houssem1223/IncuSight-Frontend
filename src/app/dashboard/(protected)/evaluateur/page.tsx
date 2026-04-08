"use client";

import RoleGuard from "@/src/components/auth/Roleguard";

export default function EvaluatorDashboardPage() {
  return (
    <RoleGuard allowedRole="EVALUATOR">
   
      <h1 className="text-3xl font-bold">Evaluator Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Welcome to the evaluator area of IncuSight.
      </p>
    </RoleGuard>    
  );
}