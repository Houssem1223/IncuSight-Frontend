"use client";

import {
  FormCheckbox,
  FormDateTimeInput,
  FormField,
  FormInput,
  FormTextarea,
} from "@/src/components/ui/forms";
import type { ProgramFormState } from "./programHelpers";

type ProgramFormFieldsProps = {
  values: ProgramFormState;
  onChange: (values: ProgramFormState) => void;
  fieldId: (field: string) => string;
  autoFocusTitle?: boolean;
};

export default function ProgramFormFields({
  values,
  onChange,
  fieldId,
  autoFocusTitle,
}: ProgramFormFieldsProps) {
  return (
    <>
      <FormField htmlFor={fieldId("title")} label="Titre" required>
        <FormInput
          autoFocus={autoFocusTitle}
          id={fieldId("title")}
          onChange={(event) => onChange({ ...values, title: event.target.value })}
          placeholder="Titre du programme"
          required
          type="text"
          value={values.title}
        />
      </FormField>

      <FormField htmlFor={fieldId("description")} label="Description" required>
        <FormTextarea
          id={fieldId("description")}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
          placeholder="Description du programme"
          required
          value={values.description}
        />
      </FormField>

      <FormField htmlFor={fieldId("openDate")} label="Date d'ouverture" required>
        <FormDateTimeInput
          id={fieldId("openDate")}
          onChange={(event) => onChange({ ...values, openDate: event.target.value })}
          required
          value={values.openDate}
        />
      </FormField>

      <FormField htmlFor={fieldId("closeDate")} label="Date de fermeture" required>
        <FormDateTimeInput
          id={fieldId("closeDate")}
          onChange={(event) => onChange({ ...values, closeDate: event.target.value })}
          required
          value={values.closeDate}
        />
      </FormField>

      <FormCheckbox
        checked={values.isOpen}
        label="Programme actuellement ouvert"
        onChange={(event) => onChange({ ...values, isOpen: event.target.checked })}
      />
    </>
  );
}
