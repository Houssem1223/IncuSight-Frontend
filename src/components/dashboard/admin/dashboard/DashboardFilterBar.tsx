"use client";

import { useCallback } from "react";
import { FormField, FormInput, FormSelect } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import type { UseDashboardFiltersResult } from "@/src/hooks/useDashboardFilters";
import type { DashboardPeriod, DashboardStatus } from "@/src/lib/dashboard-api";

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "3m", label: "3 derniers mois" },
  { value: "1y", label: "12 derniers mois" },
  { value: "custom", label: "Periode personnalisee" },
];

const statusOptions: { value: DashboardStatus; label: string }[] = [
  { value: "PENDING", label: "En attente" },
  { value: "ACCEPTED", label: "Acceptees" },
  { value: "REJECTED", label: "Rejetees" },
];

type DashboardFilterBarProps = UseDashboardFiltersResult;

export default function DashboardFilterBar({
  filters,
  setProgramId,
  setPeriod,
  setStatus,
  setCustomRange,
  reset,
  hasNonDefaultFilters,
}: DashboardFilterBarProps) {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { programs, fetchAllPrograms, clearProgramsError } = usePrograms();

  const refreshPrograms = useCallback(async () => {
    clearProgramsError();

    try {
      await fetchAllPrograms();
    } catch {
    }
  }, [clearProgramsError, fetchAllPrograms]);

  useAutoRefresh(refreshPrograms, {
    enabled: isAuthReady && isAuthenticated,
    intervalMs: 60000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
  });

  return (
    <section className="dashboard-surface flex flex-wrap items-end gap-4 p-4">
      <FormField htmlFor="dashboard-filter-program" label="Programme">
        <FormSelect
          id="dashboard-filter-program"
          onChange={(event) => setProgramId(event.target.value || undefined)}
          value={filters.programId ?? ""}
        >
          <option value="">Tous les programmes</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <FormField htmlFor="dashboard-filter-period" label="Periode">
        <FormSelect
          id="dashboard-filter-period"
          onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
          value={filters.period ?? "30d"}
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      {filters.period === "custom" && (
        <>
          <FormField htmlFor="dashboard-filter-from" label="Du">
            <FormInput
              id="dashboard-filter-from"
              onChange={(event) => setCustomRange(event.target.value, filters.to ?? "")}
              type="date"
              value={filters.from ?? ""}
            />
          </FormField>

          <FormField htmlFor="dashboard-filter-to" label="Au">
            <FormInput
              id="dashboard-filter-to"
              onChange={(event) => setCustomRange(filters.from ?? "", event.target.value)}
              type="date"
              value={filters.to ?? ""}
            />
          </FormField>
        </>
      )}

      <FormField htmlFor="dashboard-filter-status" label="Statut">
        <FormSelect
          id="dashboard-filter-status"
          onChange={(event) =>
            setStatus((event.target.value || undefined) as DashboardStatus | undefined)
          }
          value={filters.status ?? ""}
        >
          <option value="">Tous les statuts</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      {hasNonDefaultFilters && (
        <Button onClick={reset} type="button" variant="outline">
          Reinitialiser
        </Button>
      )}
    </section>
  );
}
