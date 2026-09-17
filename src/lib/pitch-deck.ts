import { downloadAuthenticatedFile } from "./download";

/**
 * Telecharge le pitch deck d'une startup. L'autorisation est verifiee cote serveur :
 * proprietaire du profil, admin, ou evaluateur assigne a une candidature de cette
 * startup.
 */
export async function downloadPitchDeck(
  startupId: string,
  token: string,
  fileName?: string | null,
): Promise<void> {
  return downloadAuthenticatedFile(
    `startup/${startupId}/pitch-deck`,
    token,
    fileName || "pitch-deck",
    "Impossible de telecharger le pitch deck.",
  );
}
