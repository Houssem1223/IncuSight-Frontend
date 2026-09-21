"use client";

import { FormEvent, ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

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
  const titleId = useId();
  const panel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    ) ?? []);
    (focusable()[0] ?? panel.current)?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => { window.removeEventListener("keydown", trapFocus); previousFocus?.focus(); };
  }, [isOpen]);

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
    "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl md:p-6",
    maxWidthClassName,
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        aria-label="Fermer la modale"
        className="modal-overlay-enter absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        disabled={isBusy}
        onClick={handleClose}
        type="button"
      />

      <form ref={panel} tabIndex={-1} aria-labelledby={titleId} aria-modal="true" className={mergedPanelClassName} onSubmit={onSubmit} role="dialog">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
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
    </div>, document.body,
  );
}
