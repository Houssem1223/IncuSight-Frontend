"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "brand";
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "brand",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isConfirming) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isConfirming, onCancel]);

  const confirmButtonClass =
    tone === "danger"
      ? "border border-red-200 bg-red-600 text-white hover:bg-red-700"
      : "bg-brand text-brand-contrast hover:brightness-95";

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  // Les cartes animées (transform, backdrop-filter, overflow:hidden) enferment
  // un enfant fixed dans leur propre cadre. Le portail l'ancre à la fenêtre.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 text-foreground md:p-6"
    >
      <button
        aria-label="Fermer la boite de confirmation"
        className="modal-overlay-enter absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        disabled={!isOpen || isConfirming}
        onClick={onCancel}
        type="button"
      />

      <div
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="modal-panel-enter relative z-10 max-h-[calc(100dvh-3rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border/75 bg-white p-5 shadow-[0_22px_45px_rgba(24,36,51,0.3)]"
        role="dialog"
      >
        <button
          aria-label="Fermer"
          className="dashboard-btn absolute right-3 top-3 rounded-lg border border-border bg-white px-2.5 py-1 text-sm font-medium text-foreground-muted hover:border-brand/35 hover:text-brand-strong"
          disabled={!isOpen || isConfirming}
          onClick={onCancel}
          type="button"
        >
          x
        </button>

        <h2 id={titleId} className="pr-9 text-lg font-semibold text-foreground">{title}</h2>
        {description && <p id={descriptionId} className="mt-2 text-sm text-foreground-muted">{description}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!isOpen || isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`dashboard-btn rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 ${confirmButtonClass}`}
            disabled={!isOpen || isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Traitement..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
