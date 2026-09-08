"use client";

import { FormEvent, useId } from "react";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormSelect,
} from "@/src/components/ui/forms";
import type { UserRole } from "@/src/types/auth";

export type CreateUserFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
};

const roleOptions: UserRole[] = ["ADMIN", "STARTUP", "EVALUATOR"];

type CreateUserModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  values: CreateUserFormValues;
  onChange: (values: CreateUserFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CreateUserModal({
  isOpen,
  isSubmitting,
  error,
  values,
  onChange,
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  const fieldIdPrefix = useId();
  const fieldId = (field: string) => `${fieldIdPrefix}-${field}`;

  return (
    <FormModal
      description="Formulaire rapide, clair et fluide pour ajouter un compte."
      isBusy={isSubmitting}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Creer un utilisateur"
    >
      <FormErrorMessage message={error} />

      <FormField htmlFor={fieldId("firstName")} label="Prenom">
        <FormInput
          autoFocus
          id={fieldId("firstName")}
          onChange={(event) => onChange({ ...values, firstName: event.target.value })}
          placeholder="Prenom"
          type="text"
          value={values.firstName}
        />
      </FormField>

      <FormField htmlFor={fieldId("lastName")} label="Nom">
        <FormInput
          id={fieldId("lastName")}
          onChange={(event) => onChange({ ...values, lastName: event.target.value })}
          placeholder="Nom"
          type="text"
          value={values.lastName}
        />
      </FormField>

      <FormField htmlFor={fieldId("email")} label="Email" required>
        <FormInput
          id={fieldId("email")}
          onChange={(event) => onChange({ ...values, email: event.target.value })}
          placeholder="Email"
          required
          type="email"
          value={values.email}
        />
      </FormField>

      <FormField htmlFor={fieldId("password")} label="Mot de passe" required>
        <FormInput
          id={fieldId("password")}
          minLength={6}
          onChange={(event) => onChange({ ...values, password: event.target.value })}
          placeholder="Mot de passe"
          required
          type="password"
          value={values.password}
        />
      </FormField>

      <FormField htmlFor={fieldId("role")} label="Role" required>
        <FormSelect
          id={fieldId("role")}
          onChange={(event) => onChange({ ...values, role: event.target.value as UserRole })}
          required
          value={values.role}
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </FormSelect>
      </FormField>

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
