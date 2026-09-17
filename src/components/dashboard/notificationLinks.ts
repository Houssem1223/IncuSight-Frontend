import type { UserRole } from "@/src/types/auth";
import type { Notification } from "@/src/types/notification";

/**
 * Chaque point d'émission du backend renseigne déjà applicationId / programId /
 * evaluationId / decisionId, mais rien ne les lisait : une notification
 * « une candidature vous a été assignée » n'offrait aucun moyen d'y aller.
 *
 * On route depuis ces identifiants et le rôle du destinataire, du plus précis au
 * plus général. Quand aucune page du rôle ne sait afficher la ressource visée, on
 * renvoie `null` et la notification reste non cliquable — un faux lien serait pire
 * que pas de lien.
 */
export function resolveNotificationHref(
  notification: Notification,
  role: UserRole | undefined,
): string | null {
  const applicationId = notification.applicationId?.trim();
  const programId = notification.programId?.trim();
  const evaluationId = notification.evaluationId?.trim();

  if (role === "ADMIN") {
    // La liste des candidatures filtre sur `?search=`, et ce filtre compare aussi
    // l'id de la candidature : le lien ouvre donc la liste réduite au dossier visé.
    if (applicationId) {
      return `/dashboard/admin/applications?search=${encodeURIComponent(applicationId)}`;
    }

    if (evaluationId) {
      return "/dashboard/admin/application-evaluations";
    }

    if (programId) {
      return "/dashboard/admin/program";
    }

    return null;
  }

  if (role === "EVALUATOR") {
    if (evaluationId || applicationId) {
      return "/dashboard/evaluateur/reviews";
    }

    if (programId) {
      return "/dashboard/evaluateur/assignments";
    }

    return null;
  }

  if (role === "STARTUP") {
    // La décision et le statut d'une candidature se lisent au même endroit. Cette
    // page ne lit aucun query param aujourd'hui : on n'en invente pas un.
    if (applicationId || notification.decisionId?.trim()) {
      return "/dashboard/startup/candidatures";
    }

    if (programId) {
      return "/dashboard/startup";
    }

    return null;
  }

  return null;
}
