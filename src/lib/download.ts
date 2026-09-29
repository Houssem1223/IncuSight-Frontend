import { ApiError, apiFetchBlob } from "./api";

/**
 * Telecharge un binaire servi par l'API.
 *
 * Le transport binaire utilise aussi le renouvellement centralise de session.
 */
export async function downloadAuthenticatedFile(
  path: string,
  token: string,
  fileName?: string | null,
  errorMessage = "Impossible de telecharger le fichier.",
): Promise<void> {
  let blob: Blob;
  try {
    blob = await apiFetchBlob(path, {}, token);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(errorMessage, { cause: error });
  }
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || "document";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}
