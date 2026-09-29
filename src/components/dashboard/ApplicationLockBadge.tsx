import { LockKeyhole } from "lucide-react";
import { isApplicantApplicationLocked } from "@/src/lib/application-permissions";
import type { Application } from "@/src/types/application";

export default function ApplicationLockBadge({ application }: { application: Application }) {
  if (!isApplicantApplicationLocked(application)) return null;
  return <span title="La décision est rendue. Le candidat ne peut plus modifier ni retirer ce dossier." className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted"><LockKeyhole size={12} aria-hidden="true" />Verrouillée</span>;
}
