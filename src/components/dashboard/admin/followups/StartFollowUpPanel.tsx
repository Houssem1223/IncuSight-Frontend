"use client";

import { Plus } from "lucide-react";
import { FormErrorMessage, FormSelect } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import type { Application } from "@/src/types/application";
import { getApplicationLabel } from "./followupHelpers";

type StartFollowUpPanelProps = {
  availableApplications: Application[];
  applicationId: string;
  isCreating: boolean;
  errorMessage: string | null;
  onApplicationChange: (applicationId: string) => void;
  onCreate: () => void;
};

export default function StartFollowUpPanel({
  availableApplications,
  applicationId,
  isCreating,
  errorMessage,
  onApplicationChange,
  onCreate,
}: StartFollowUpPanelProps) {
  return (
    <section className="dashboard-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Démarrer un suivi</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Seules les candidatures acceptées sans suivi existant sont proposées.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[32rem] md:flex-row">
          <FormSelect
            aria-label="Candidature acceptée"
            disabled={isCreating || availableApplications.length === 0}
            onChange={(event) => onApplicationChange(event.target.value)}
            value={applicationId}
          >
            <option value="">
              {availableApplications.length === 0
                ? "Aucune candidature disponible"
                : "Sélectionner une candidature"}
            </option>
            {availableApplications.map((application) => (
              <option key={application.id} value={application.id}>
                {getApplicationLabel(application)}
              </option>
            ))}
          </FormSelect>
          <Button
            disabled={!applicationId || isCreating}
            onClick={onCreate}
            type="button"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "Création..." : "Créer le suivi"}
          </Button>
        </div>
      </div>

      {errorMessage && <FormErrorMessage className="mt-4" message={errorMessage} />}
    </section>
  );
}
