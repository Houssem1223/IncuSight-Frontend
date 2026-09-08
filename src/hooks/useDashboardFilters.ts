"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DashboardFilters, DashboardPeriod, DashboardStatus } from "@/src/lib/dashboard-api";

const DEFAULT_PERIOD: DashboardPeriod = "30d";
const VALID_PERIODS: DashboardPeriod[] = ["7d", "30d", "3m", "1y", "custom"];
const VALID_STATUSES: DashboardStatus[] = ["PENDING", "ACCEPTED", "REJECTED"];

function parsePeriod(value: string | null): DashboardPeriod {
  return VALID_PERIODS.includes(value as DashboardPeriod) ? (value as DashboardPeriod) : DEFAULT_PERIOD;
}

function parseStatus(value: string | null): DashboardStatus | undefined {
  return VALID_STATUSES.includes(value as DashboardStatus) ? (value as DashboardStatus) : undefined;
}

export type UseDashboardFiltersResult = {
  filters: DashboardFilters;
  setProgramId: (programId: string | undefined) => void;
  setPeriod: (period: DashboardPeriod) => void;
  setStatus: (status: DashboardStatus | undefined) => void;
  setCustomRange: (from: string, to: string) => void;
  reset: () => void;
  hasNonDefaultFilters: boolean;
};

export function useDashboardFilters(): UseDashboardFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const period = parsePeriod(searchParams.get("period"));

  const filters = useMemo<DashboardFilters>(() => {
    const programId = searchParams.get("programId") ?? undefined;
    const status = parseStatus(searchParams.get("status"));

    return {
      programId,
      period,
      ...(period === "custom"
        ? {
            from: searchParams.get("from") ?? undefined,
            to: searchParams.get("to") ?? undefined,
          }
        : {}),
      status,
    };
  }, [searchParams, period]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setProgramId = useCallback(
    (programId: string | undefined) => {
      updateParams((params) => {
        if (programId) {
          params.set("programId", programId);
        } else {
          params.delete("programId");
        }
      });
    },
    [updateParams],
  );

  const setPeriod = useCallback(
    (nextPeriod: DashboardPeriod) => {
      updateParams((params) => {
        if (nextPeriod === DEFAULT_PERIOD) {
          params.delete("period");
        } else {
          params.set("period", nextPeriod);
        }

        if (nextPeriod !== "custom") {
          params.delete("from");
          params.delete("to");
        }
      });
    },
    [updateParams],
  );

  const setStatus = useCallback(
    (status: DashboardStatus | undefined) => {
      updateParams((params) => {
        if (status) {
          params.set("status", status);
        } else {
          params.delete("status");
        }
      });
    },
    [updateParams],
  );

  const setCustomRange = useCallback(
    (from: string, to: string) => {
      updateParams((params) => {
        params.set("period", "custom");

        if (from) {
          params.set("from", from);
        } else {
          params.delete("from");
        }

        if (to) {
          params.set("to", to);
        } else {
          params.delete("to");
        }
      });
    },
    [updateParams],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasNonDefaultFilters =
    Boolean(filters.programId) ||
    filters.period !== DEFAULT_PERIOD ||
    Boolean(filters.status) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  return { filters, setProgramId, setPeriod, setStatus, setCustomRange, reset, hasNonDefaultFilters };
}
