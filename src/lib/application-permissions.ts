import type { Application } from "../types/application";

// application.service.removeMine only allows PENDING. There is no applicant
// edit endpoint; admin decision revision remains available through its own route.
export function isApplicantApplicationLocked(application: Application): boolean {
  return application.status === "ACCEPTED" || application.status === "REJECTED";
}
