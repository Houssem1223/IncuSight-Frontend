import { applicationStatusLabel } from "./application-status";
import type { Notification } from "@/src/types/notification";

/**
 * Lecture du champ `data` d'une notification.
 *
 * Le backend y depose depuis le debut le contexte de l'evenement — commentaire
 * de decision, nom du programme, nom de la startup, echeance — et rien ne le
 * lisait : le panneau n'affichait que `title` et `message`, ce qui obligeait a
 * ouvrir la ressource pour savoir de quoi il retournait. Les identifiants, eux,
 * servent deja au routage (voir `notificationLinks`).
 *
 * Les valeurs viennent telles quelles de l'API : on ne garde que les chaines
 * non vides et connues, le reste est ignore plutot que rendu brut.
 */

export type NotificationFact = {
  label: string;
  value: string;
};

export type NotificationDetails = {
  /** Texte long (commentaire de decision), affiche en citation. */
  comment: string | null;
  /** Date ISO d'echeance, laissee au formatage de l'appelant. */
  deadlineAt: string | null;
  /** Contexte court, affiche en ligne. */
  facts: NotificationFact[];
};

function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getNotificationDetails(notification: Notification): NotificationDetails {
  const data = notification.data;

  if (!data || typeof data !== "object") {
    return { comment: null, deadlineAt: null, facts: [] };
  }

  const record = data as Record<string, unknown>;
  const facts: NotificationFact[] = [];

  const startupName = readString(record, "startupName");
  if (startupName) {
    facts.push({ label: "Startup", value: startupName });
  }

  const programName = readString(record, "programName");
  if (programName) {
    facts.push({ label: "Programme", value: programName });
  }

  const status = readString(record, "status");
  if (status) {
    facts.push({ label: "Statut", value: applicationStatusLabel(status) });
  }

  return {
    comment: readString(record, "comment"),
    deadlineAt: readString(record, "deadlineAt"),
    facts,
  };
}
