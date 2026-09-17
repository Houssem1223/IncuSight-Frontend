import { downloadAuthenticatedFile } from "./download";
import type { FollowUpAttachment } from "@/src/types/incubation-followups";

/**
 * Qui a depose le livrable. Renvoie `null` quand l'API ne sert pas l'auteur :
 * un « depose par - » ne vaut mieux que rien.
 */
export function getAttachmentAuthorLabel(attachment: FollowUpAttachment): string | null {
  const author = attachment.uploadedBy;

  if (!author) {
    return null;
  }

  const fullName = [author.firstName, author.lastName].filter(Boolean).join(" ").trim();

  return fullName || author.email || null;
}



export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} o`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export async function downloadFollowUpAttachment(
  attachmentId: string,
  token: string,
  fileName?: string | null,
): Promise<void> {
  return downloadAuthenticatedFile(
    `incubation-followups/attachments/${attachmentId}`,
    token,
    fileName,
    "Impossible de telecharger ce livrable.",
  );
}
