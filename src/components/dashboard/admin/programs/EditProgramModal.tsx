"use client";

import { FormEvent, useId } from "react";
import { FormActions, FormErrorMessage, FormModal } from "@/src/components/ui/forms";
import ProgramFormFields from "./ProgramFormFields";
import type { ProgramEditFormState, ProgramFormState } from "./programHelpers";

type EditProgramModalProps = {
  values: ProgramEditFormState | null;
  isSubmitting: boolean;
  error: string | null;
  onChange: (values: ProgramEditFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function EditProgramModal({
  values,
  isSubmitting,
  error,
  onChange,
  onClose,
  onSubmit,
}: EditProgramModalProps) {
  const fieldIdPrefix = useId();
  const fieldId = (field: string) => `${fieldIdPrefix}-${field}`;

  if (!values) {
    return null;
  }

  const handleFieldsChange = (fields: ProgramFormState) => {
    onChange({ ...fields, id: values.id });
  };

  return (
    <FormModal
      description="Ajustez les informations et les dates du programme."
      isBusy={isSubmitting}
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      title="Modifier programme"
    >
      <FormErrorMessage message={error} />

      <ProgramFormFields autoFocusTitle fieldId={fieldId} onChange={handleFieldsChange} values={values} />

      <FormActions>
        <button
          className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
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
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </FormActions>
    </FormModal>
  );
}
