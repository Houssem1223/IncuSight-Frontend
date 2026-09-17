"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormModal,
  FormSelect,
  FormTextarea,
} from "@/src/components/ui/forms";
import type { Application } from "@/src/types/application";

type ReviseDecisionModalProps = {
  application: Application | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (status: string, reason: string) => void;
};

/**
 * Reviser une decision est une action lourde : elle change le sens d'une decision
 * deja communiquee au candidat et, dans le cas ACCEPTED -> REJECTED, abandonne le
 * dossier de suivi d'incubation. On l'annonce avant, et le motif est obligatoire.
 */
export default function ReviseDecisionModal({
  application,
  isSubmitting,
  onCancel,
  onConfirm,
}: ReviseDecisionModalProps) {
  const fieldPrefix = useId();
  const currentStatus = (application?.decision?.status || "").toUpperCase();
  const defaultNextStatus = currentStatus === "ACCEPTED" ? "REJECTED" : "ACCEPTED";

  const [status, setStatus] = useState(defaultNextStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError("Le motif de la revision est obligatoire.");
      return;
    }

    onConfirm(status, reason.trim());
  };

  const losesFollowUp = currentStatus === "ACCEPTED" && status === "REJECTED";

  return (
    <FormModal
      description={`Decision actuelle : ${currentStatus || "inconnue"}. Le changement sera historise.`}
      isBusy={isSubmitting}
      isOpen={application !== null}
      onClose={() => {
        setReason("");
        setError("");
        onCancel();
      }}
      onSubmit={handleSubmit}
      title="Reviser la decision"
    >
      <FormField htmlFor={`${fieldPrefix}-status`} label="Nouvelle decision" required>
        <FormSelect
          id={`${fieldPrefix}-status`}
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          <option value="ACCEPTED">Acceptee</option>
          <option value="REJECTED">Non retenue</option>
        </FormSelect>
      </FormField>

      <FormField
        hint="Communique au candidat et conserve dans l'historique de la decision."
        htmlFor={`${fieldPrefix}-reason`}
        label="Motif de la revision"
        required
      >
        <FormTextarea
          id={`${fieldPrefix}-reason`}
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex : erreur de saisie, la decision du comite etait favorable."
          rows={4}
          value={reason}
        />
      </FormField>

      {losesFollowUp && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Le dossier de suivi d&apos;incubation existant passera en
          &laquo;&nbsp;abandonne&nbsp;&raquo;. Ses objectifs et comptes rendus sont
          conserves, pas supprimes.
        </p>
      )}

      <FormErrorMessage message={error} />

      <FormActions>
        <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="outline">
          Annuler
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Revision..." : "Reviser la decision"}
        </Button>
      </FormActions>
    </FormModal>
  );
}
