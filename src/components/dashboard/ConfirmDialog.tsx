"use client";

import { useEffect } from "react";

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
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "brand",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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

  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    tone === "danger"
      ? "border border-red-200 bg-red-600 text-white hover:bg-red-700"
      : "bg-brand text-brand-contrast hover:brightness-95";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        disabled={isConfirming}
        onClick={onCancel}
        type="button"
      />

      <div
        aria-modal="true"
        className="motion-rise relative z-10 w-full max-w-md rounded-2xl border border-border/75 bg-white p-5 shadow-[0_22px_45px_rgba(24,36,51,0.3)]"
        role="dialog"
      >
        <button
          aria-label="Close"
          className="dashboard-btn absolute right-3 top-3 rounded-lg border border-border bg-white px-2.5 py-1 text-sm font-medium text-foreground-muted hover:border-brand/35 hover:text-brand-strong"
          disabled={isConfirming}
          onClick={onCancel}
          type="button"
        >
          x
        </button>

        <h2 className="pr-9 text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-foreground-muted">{description}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`dashboard-btn rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70 ${confirmButtonClass}`}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
