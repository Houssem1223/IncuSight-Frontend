"use client";

import { FormEvent, ReactNode, useEffect } from "react";

type FormModalProps = {
  isOpen: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  closeLabel?: string;
  maxWidthClassName?: string;
  panelClassName?: string;
  isBusy?: boolean;
};

export default function FormModal({
  isOpen,
  title,
  description,
  onClose,
  onSubmit,
  children,
  closeLabel = "Fermer",
  maxWidthClassName = "max-w-2xl",
  panelClassName,
  isBusy = false,
}: FormModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (!isBusy) {
      onClose();
    }
  };

  const mergedPanelClassName = [
    "modal-panel-enter relative z-10 flex w-full flex-col gap-4 rounded-3xl border border-border/75 bg-gradient-to-br from-white via-slate-50 to-orange-50/30 p-5 shadow-[0_30px_70px_rgba(24,36,51,0.28)] md:p-6",
    maxWidthClassName,
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Fermer la modale"
        className="modal-overlay-enter absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        disabled={isBusy}
        onClick={handleClose}
        type="button"
      />

      <form aria-modal="true" className={mergedPanelClassName} onSubmit={onSubmit} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}
          </div>

          <button
            aria-label={typeof closeLabel === "string" ? closeLabel : "Fermer"}
            className="dashboard-btn rounded-lg border border-border bg-white px-2.5 py-1 text-sm font-medium text-foreground-muted hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isBusy}
            onClick={handleClose}
            type="button"
          >
            x
          </button>
        </div>

        {children}
      </form>
    </div>
  );
}
