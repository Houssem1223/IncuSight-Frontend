import { FormTextarea } from "@/src/components/ui/forms";
import { Button } from "@/src/components/ui/button";

export default function NotesTab({ value, savedValue, busy, onChange, onSave }: {
  value: string; savedValue: string; busy: boolean; onChange: (value: string) => void; onSave: () => void;
}) {
  return <section className="inc-notes space-y-5"><div><h3 className="text-xl font-semibold">Notes internes</h3><p className="mt-1 text-sm text-foreground-muted">Visibles uniquement par l’équipe de l’incubateur.</p></div>
    <label className="block"><span className="mb-2 block text-sm font-medium">Notes d’accompagnement</span><FormTextarea rows={10} value={value} disabled={busy} onChange={event => onChange(event.target.value)} placeholder="Contexte, points à suivre, échanges avec la startup…" /></label>
    <div className="flex flex-wrap items-center gap-3"><Button type="button" disabled={busy || value === savedValue} onClick={onSave}>{busy ? "Enregistrement…" : "Enregistrer les notes"}</Button><span role="status" className="text-sm text-foreground-muted">{value !== savedValue ? "Modifications non enregistrées" : "Notes à jour"}</span></div>
  </section>;
}
