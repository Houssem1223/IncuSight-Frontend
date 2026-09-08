"use client";

import { type FormEvent, useId } from "react";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormSelect,
  FormTextarea,
} from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import type {
  FollowUpObjective,
  FollowUpObjectivePriority,
  FollowUpObjectiveStatus,
} from "@/src/types/incubation-followups";
import {
  objectivePriorities,
  objectiveStatusLabels,
  objectiveStatuses,
  priorityLabels,
  type ObjectiveFormState,
} from "./followupHelpers";

type ObjectiveModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  editingObjective: FollowUpObjective | null;
  values: ObjectiveFormState;
  error: string;
  onChange: (values: ObjectiveFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ObjectiveModal({
  isOpen,
  isSubmitting,
  editingObjective,
  values,
  error,
  onChange,
  onClose,
  onSubmit,
}: ObjectiveModalProps) {
  const fieldIdPrefix = useId();

  return (
    <FormModal
      description={
        editingObjective
          ? "Modifiez le contenu, le statut et la progression de cet objectif."
          : "Définissez un objectif clair et mesurable pour la startup."
      }
      isBusy={isSubmitting}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title={editingObjective ? "Modifier l’objectif" : "Ajouter un objectif"}
    >
      <FormErrorMessage message={error} />

      <div className="grid gap-4">
        <FormField htmlFor={`${fieldIdPrefix}-objective-title`} label="Titre" required>
          <FormInput
            disabled={isSubmitting}
            id={`${fieldIdPrefix}-objective-title`}
            maxLength={160}
            onChange={(event) => onChange({ ...values, title: event.target.value })}
            placeholder="Ex. Valider la proposition de valeur"
            required
            value={values.title}
          />
        </FormField>

        <FormField htmlFor={`${fieldIdPrefix}-objective-description`} label="Description">
          <FormTextarea
            disabled={isSubmitting}
            id={`${fieldIdPrefix}-objective-description`}
            onChange={(event) => onChange({ ...values, description: event.target.value })}
            placeholder="Résultat attendu et critères de réussite..."
            value={values.description}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor={`${fieldIdPrefix}-objective-priority`} label="Priorité" required>
            <FormSelect
              disabled={isSubmitting}
              id={`${fieldIdPrefix}-objective-priority`}
              onChange={(event) =>
                onChange({ ...values, priority: event.target.value as FollowUpObjectivePriority })
              }
              value={values.priority}
            >
              {objectivePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField htmlFor={`${fieldIdPrefix}-objective-deadline`} label="Échéance">
            <FormInput
              disabled={isSubmitting}
              id={`${fieldIdPrefix}-objective-deadline`}
              onChange={(event) => onChange({ ...values, deadlineAt: event.target.value })}
              type="date"
              value={values.deadlineAt}
            />
          </FormField>
        </div>

        {editingObjective && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor={`${fieldIdPrefix}-objective-status`} label="Statut" required>
              <FormSelect
                disabled={isSubmitting}
                id={`${fieldIdPrefix}-objective-status`}
                onChange={(event) =>
                  onChange({ ...values, status: event.target.value as FollowUpObjectiveStatus })
                }
                value={values.status}
              >
                {objectiveStatuses.map((status) => (
                  <option key={status} value={status}>
                    {objectiveStatusLabels[status]}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField htmlFor={`${fieldIdPrefix}-objective-progress`} label="Progression (%)" required>
              <FormInput
                disabled={isSubmitting}
                id={`${fieldIdPrefix}-objective-progress`}
                max={100}
                min={0}
                onChange={(event) => onChange({ ...values, progress: event.target.value })}
                required
                type="number"
                value={values.progress}
              />
            </FormField>
          </div>
        )}
      </div>

      <FormActions>
        <Button disabled={isSubmitting} onClick={onClose} type="button" variant="outline">
          Annuler
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </FormActions>
    </FormModal>
  );
}
