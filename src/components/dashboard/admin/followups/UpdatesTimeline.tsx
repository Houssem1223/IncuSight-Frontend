"use client";

import { useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  downloadFollowUpAttachment,
  formatFileSize,
  getAttachmentAuthorLabel,
} from "@/src/lib/follow-up-attachments";
import type { FollowUpUpdate } from "@/src/types/incubation-followups";
import { formatDate } from "./followupHelpers";

type UpdatesTimelineProps = {
  updates: FollowUpUpdate[];
};

export default function UpdatesTimeline({ updates }: UpdatesTimelineProps) {
  const { token } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (attachmentId: string, fileName: string) => {
    if (!token) {
      return;
    }

    setDownloadError("");
    setDownloadingId(attachmentId);

    try {
      await downloadFollowUpAttachment(attachmentId, token, fileName);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Impossible de télécharger ce livrable.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="inc-journal">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Journal d’avancement</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Comptes rendus publiés par la startup, du plus récent au plus ancien.
        </p>
      </div>

      {updates.length === 0 && (
        <p className="mt-4 rounded-xl border border-border/75 bg-surface p-4 text-sm text-foreground-muted">
          Aucun compte rendu transmis.
        </p>
      )}

      {downloadError && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {downloadError}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {[...updates].sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")).map((update) => (
          <article className="inc-timeline-row" key={update.id}>
            <time className="inc-timeline-date" dateTime={update.createdAt || undefined}>{formatDate(update.createdAt)}</time>
            <div className="inc-update">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {update.title || "Point d’avancement"}
                  </h3>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {update.author?.email || "Startup"}
                  </p>
                </div>
                {typeof update.progress === "number" && (
                  <span className="semantic-badge" data-tone="info">
                    {update.progress} %
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-3">
                <div className="inc-update-field" data-kind="done">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
                    Réalisé
                  </p>
                  <p className="mt-1 text-sm text-foreground">{update.done}</p>
                </div>
                {(update.nextSteps || update.blockers || update.needs) && <details className="inc-update-details">
                  <summary>Voir le détail</summary><div className="mt-3 space-y-3">
                {update.nextSteps && (
                  <div className="inc-update-field" data-kind="next">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
                      Prochaines étapes
                    </p>
                    <p className="mt-1 text-sm text-foreground">{update.nextSteps}</p>
                  </div>
                )}
                {update.blockers && (
                  <div className="inc-update-field" data-kind="blockers">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
                      Blocages
                    </p>
                    <p className="mt-1 text-sm text-foreground">{update.blockers}</p>
                  </div>
                )}
                {update.needs && (
                  <div className="inc-update-field" data-kind="needs">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
                      Besoins
                    </p>
                    <p className="mt-1 text-sm text-foreground">{update.needs}</p>
                  </div>
                )}
                  </div></details>}

              </div>

              {(update.attachments?.length || 0) > 0 && (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground-muted">
                    Livrables joints
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {(update.attachments || []).map((attachment) => {
                      const author = getAttachmentAuthorLabel(attachment);

                      return (
                      <li key={attachment.id}>
                        <button
                          className="dashboard-btn rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:opacity-70"
                          disabled={downloadingId === attachment.id}
                          onClick={() =>
                            void handleDownload(attachment.id, attachment.originalName)
                          }
                          type="button"
                        >
                          {downloadingId === attachment.id
                            ? "Téléchargement…"
                            : `${attachment.originalName} · ${formatFileSize(attachment.size)}`}
                        </button>
                        {/* Seule une startup depose un livrable : c'est ici, dans la
                            vue partagee, que l'auteur renseigne. */}
                        {author && (
                          <span className="ml-2 text-xs text-foreground-muted">
                            déposé par {author}
                          </span>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
