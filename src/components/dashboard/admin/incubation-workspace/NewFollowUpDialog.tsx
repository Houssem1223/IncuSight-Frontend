import { FormModal, FormSelect, FormField, FormErrorMessage } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";
import type { Application } from "@/src/types/application";
import { getApplicationLabel } from "../followups/followupHelpers";

export default function NewFollowUpDialog({ isOpen, onClose, applications, value, onChange, onCreate, busy, error }: {
  isOpen: boolean; onClose: () => void; applications: Application[]; value: string;
  onChange: (value: string) => void; onCreate: () => void; busy: boolean; error: string | null;
}) {
  return <FormModal isOpen={isOpen} onClose={onClose} isBusy={busy} title="Nouveau suivi"
    description="Commencez l’accompagnement d’une startup dont la candidature a été acceptée."
    onSubmit={event => { event.preventDefault(); onCreate(); }} maxWidthClassName="max-w-lg">
    <FormField htmlFor="inc-new-application" label="Candidature acceptée">
      <FormSelect id="inc-new-application" value={value} onChange={event => onChange(event.target.value)} disabled={busy || !applications.length} required>
        <option value="">Sélectionner une candidature</option>
        {applications.map(application => <option key={application.id} value={application.id}>{getApplicationLabel(application)}</option>)}
      </FormSelect>
    </FormField>
    {!applications.length && <p className="text-sm text-foreground-muted">Aucune candidature acceptée sans suivi existant.</p>}
    {error && <FormErrorMessage message={error} />}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !value}>{busy ? "Création…" : "Créer le suivi"}</Button></div>
  </FormModal>;
}
