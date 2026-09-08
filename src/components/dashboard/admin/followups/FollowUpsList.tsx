"use client";

import { Search } from "lucide-react";
import { FormSelect } from "@/src/components/ui/forms";
import { Progress } from "@/src/components/ui/progress";
import type { FollowUpStatus, IncubationFollowUp } from "@/src/types/incubation-followups";
import {
  followUpStatusClass,
  followUpStatusLabels,
  followUpStatuses,
  getFollowUpLabel,
  getReportedProgress,
} from "./followupHelpers";

type FollowUpsListProps = {
  followUps: IncubationFollowUp[];
  activeFollowUpId: string;
  isLoading: boolean;
  searchQuery: string;
  statusFilter: "ALL" | FollowUpStatus;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: "ALL" | FollowUpStatus) => void;
  onSelect: (followUpId: string) => void;
};

export default function FollowUpsList({
  followUps,
  activeFollowUpId,
  isLoading,
  searchQuery,
  statusFilter,
  onSearchQueryChange,
  onStatusFilterChange,
  onSelect,
}: FollowUpsListProps) {
  return (
    <aside className="dashboard-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Dossiers suivis</h2>
        <span className="text-sm text-foreground-muted">{followUps.length}</span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-white px-3">
          <Search className="h-4 w-4 text-foreground-muted" />
          <input
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Startup ou programme..."
            type="search"
            value={searchQuery}
          />
        </div>
        <FormSelect
          aria-label="Filtrer par statut"
          onChange={(event) => onStatusFilterChange(event.target.value as "ALL" | FollowUpStatus)}
          value={statusFilter}
        >
          <option value="ALL">Tous les statuts</option>
          {followUpStatuses.map((status) => (
            <option key={status} value={status}>
              {followUpStatusLabels[status]}
            </option>
          ))}
        </FormSelect>
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2">
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {!isLoading && followUps.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
          Aucun suivi ne correspond aux critères.
        </p>
      )}

      <div className="mt-4 max-h-[42rem] space-y-2 overflow-y-auto pr-1">
        {followUps.map((followUp) => {
          const status = followUp.status || "ACTIVE";
          const isActive = followUp.id === activeFollowUpId;
          const progress = getReportedProgress(followUp);

          return (
            <button
              className={`w-full rounded-xl border p-3 text-left transition ${
                isActive
                  ? "border-brand/50 bg-orange-50/80 shadow-sm"
                  : "border-border/70 bg-white/85 hover:border-brand/30"
              }`}
              key={followUp.id}
              onClick={() => onSelect(followUp.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {getFollowUpLabel(followUp)}
                  </p>
                  <p className="mt-1 truncate text-xs text-foreground-muted">
                    {followUp.program?.title || followUp.programId}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${followUpStatusClass(status)}`}
                >
                  {followUpStatusLabels[status]}
                </span>
              </div>
              <Progress
                className="mt-3"
                indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
                value={progress}
              />
              <p className="mt-1 text-right text-[11px] text-foreground-muted">{progress} %</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
