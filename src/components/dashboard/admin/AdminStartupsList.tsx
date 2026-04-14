"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";

export default function AdminStartupsList() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { startups, isStartupsLoading, startupsError, clearStartupsError, fetchAllStartups } =
    useStartups();

  const [searchTerm, setSearchTerm] = useState("");

  const refreshStartups = useCallback(async () => {
    clearStartupsError();

    try {
      await fetchAllStartups();
    } catch {
    }
  }, [clearStartupsError, fetchAllStartups]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refreshStartups();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshStartups();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, 60000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [isAuthReady, isAuthenticated, refreshStartups]);

  const sortedStartups = useMemo(
    () =>
      [...startups].sort((left, right) => {
        return left.startupName.localeCompare(right.startupName);
      }),
    [startups],
  );

  const filteredStartups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedStartups;
    }

    return sortedStartups.filter((startup) => {
      const name = startup.startupName.toLowerCase();
      const owner = [
        startup.owner?.firstName || "",
        startup.owner?.lastName || "",
        startup.owner?.email || "",
        startup.ownerId,
      ]
        .join(" ")
        .toLowerCase();
      const sector = (startup.sector || "").toLowerCase();
      const stage = (startup.stage || "").toLowerCase();
      const status = (startup.status || "pending").toLowerCase();

      return (
        name.includes(query) ||
        owner.includes(query) ||
        sector.includes(query) ||
        stage.includes(query) ||
        status.includes(query)
      );
    });
  }, [sortedStartups, searchTerm]);

  return (
    <section className="motion-rise dashboard-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Startups Directory
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {searchTerm.trim()
              ? `Showing ${filteredStartups.length} of ${startups.length} startups`
              : `Total startups: ${startups.length}`}
          </p>
        </div>

        <div className="w-full max-w-sm">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
            Search Startups
          </label>
          <input
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name, sector, stage, owner, status..."
            type="text"
            value={searchTerm}
          />
        </div>
      </div>

      {isStartupsLoading && (
        <div className="mt-6 space-y-2">
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {!isStartupsLoading && startupsError && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {startupsError}
        </p>
      )}

      {!isStartupsLoading && !startupsError && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-foreground-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Startup</th>
                  <th className="px-4 py-3 font-medium">Sector</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStartups.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                      {searchTerm.trim() ? "No matching startups found." : "No startups found."}
                    </td>
                  </tr>
                )}

                {filteredStartups.map((startup) => {
                  const startupName = startup.startupName;
                  const sector = startup.sector || "-";
                  const stage = startup.stage || "-";
                  const ownerName = [startup.owner?.firstName, startup.owner?.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  const owner = ownerName || startup.owner?.email || startup.ownerId;
                  const status = startup.status || "PENDING";

                  const statusClass =
                    status.toLowerCase() === "accepted"
                      ? "bg-emerald-50 text-emerald-700"
                      : status.toLowerCase() === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700";

                  return (
                    <tr className="border-t border-border/60" key={startup.id}>
                      <td className="px-4 py-3 text-foreground">{startupName}</td>
                      <td className="px-4 py-3 text-foreground-muted">{sector}</td>
                      <td className="px-4 py-3 text-foreground-muted">{stage}</td>
                      <td className="px-4 py-3 text-foreground-muted">{owner}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
