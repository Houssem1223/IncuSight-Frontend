"use client";

import type { FormEvent } from "react";
import FormModal from "@/src/components/ui/forms/FormModal";

export type StatusUpdateConfirmation = {
  applicationId: string;
  currentStatus: string;
  nextStatus: string;
  programLabel: string;
  startupLabel: string;
  comment: string;
};

type DecisionModalProps = {
  confirmation: StatusUpdateConfirmation | null;
  isSubmitting: boolean;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DecisionModal({
  confirmation,
  isSubmitting,
  onCommentChange,
  onClose,
  onSubmit,
}: DecisionModalProps) {
  return (
    <FormModal
      closeLabel="Fermer"
      description={
        confirmation
          ? `Vous allez publier la decision ${confirmation.nextStatus} pour ${confirmation.startupLabel} dans ${confirmation.programLabel}.`
          : undefined
      }
      isBusy={isSubmitting}
      isOpen={Boolean(confirmation)}
      maxWidthClassName="max-w-xl"
      onClose={onClose}
      onSubmit={onSubmit}
      title="Decision finale"
    >
      <div className="space-y-3">
        <p className="text-xs text-foreground-muted">
          Statut actuel:{" "}
          <span className="font-medium text-foreground">{confirmation?.currentStatus}</span>
        </p>

        <label className="block text-sm font-medium text-foreground" htmlFor="decision-comment">
          Commentaire (optionnel)
        </label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          id="decision-comment"
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder="Ajoutez un contexte pour cette decision finale..."
          value={confirmation?.comment || ""}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button
          className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          Annuler
        </button>
        <button
          className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer la decision"}
        </button>
      </div>
    </FormModal>
  );
}
