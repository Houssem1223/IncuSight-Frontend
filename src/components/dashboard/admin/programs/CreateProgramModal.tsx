"use client";

import { FormEvent, useId } from "react";
import { FormActions, FormErrorMessage, FormModal } from "@/src/components/ui/forms";
import ProgramFormFields from "./ProgramFormFields";
import type { ProgramFormState } from "./programHelpers";

type CreateProgramModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  values: ProgramFormState;
  onChange: (values: ProgramFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CreateProgramModal({
  isOpen,
  isSubmitting,
  error,
  values,
  onChange,
  onClose,
  onSubmit,
}: CreateProgramModalProps) {
  const fieldIdPrefix = useId();
  const fieldId = (field: string) => `${fieldIdPrefix}-${field}`;

  return (
    <FormModal
      description="Formulaire moderne pour publier rapidement un nouveau programme."
      isBusy={isSubmitting}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Creer un programme"
    >
      <FormErrorMessage message={error} />

      <ProgramFormFields autoFocusTitle fieldId={fieldId} onChange={onChange} values={values} />

      <FormActions>
        <button
          className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
          onClick={onClose}
          type="button"
        >
          Annuler
        </button>

        <button
          className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creation..." : "Creer"}
        </button>
      </FormActions>
    </FormModal>
  );
}
