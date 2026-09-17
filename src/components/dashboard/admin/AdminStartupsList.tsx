"use client";

import { useCallback, useMemo, useState } from "react";
import StartupLogo from "@/src/components/dashboard/StartupLogo";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import { downloadStartupsCsv } from "@/src/lib/reports";

// Une pastille par lien renseigne : la colonne reste lisible meme quand les trois
// sont presents, et on n'affiche rien plutot qu'un lien mort quand il manque.
function ExternalLinkChip({ label, url }: { label: string; url?: string | null }) {
  const href = url?.trim();

  if (!href) {
    return null;
  }

  return (
    <a
      className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-brand-strong hover:border-brand/35"
      href={href.startsWith("http") ? href : `https://${href}`}
      rel="noreferrer noopener"
      target="_blank"
    >
      {label}
    </a>
  );
}

export default function AdminStartupsList() {
  const { isAuthReady, isAuthenticated, token } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = async () => {
    if (!token) {
      return;
    }

    setExportError("");
    setIsExporting(true);

    try {
      await downloadStartupsCsv(token);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Impossible d'exporter les startups.",
      );
    } finally {
      setIsExporting(false);
    }
  };

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

  useAutoRefresh(refreshStartups, {
    enabled: isAuthReady && isAuthenticated,
    intervalMs: 60000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
  });

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

        <div className="flex flex-col items-start gap-1">
          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isExporting}
            onClick={() => void handleExport()}
            type="button"
          >
            {isExporting ? "Export..." : "Exporter en CSV"}
          </button>
          {exportError && <span className="text-xs text-red-700">{exportError}</span>}
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
                  <th className="px-4 py-3 font-medium">Liens</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStartups.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-foreground-muted" colSpan={6}>
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
                  // StartupProfileStatus ne vaut que DRAFT ou PUBLISHED : l'ancien
                  // mapping accepted/rejected/PENDING datait d'avant cette migration
                  // et affichait un badge orange « PENDING » sur tous les profils.
                  const status = startup.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
                  const statusClass =
                    status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600";

                  return (
                    <tr className="border-t border-border/60" key={startup.id}>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2.5">
                          <StartupLogo
                            className="h-8 w-8 flex-none rounded-lg border border-border/70 object-contain"
                            hasLogo={Boolean(startup.logoOriginalName)}
                            startupId={startup.id}
                            startupName={startupName}
                          />
                          <span>{startupName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{sector}</td>
                      <td className="px-4 py-3 text-foreground-muted">{stage}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <ExternalLinkChip label="Site" url={startup.website} />
                          <ExternalLinkChip label="LinkedIn" url={startup.linkedinUrl} />
                          <ExternalLinkChip label="Deck" url={startup.deckUrl} />
                        </div>
                      </td>
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
