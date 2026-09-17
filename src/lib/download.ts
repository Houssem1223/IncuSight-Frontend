import { API_URL } from "./api";

/**
 * Telecharge un binaire servi par l'API.
 *
 * apiFetch() parse la reponse en JSON/texte : inadapte a un fichier, on passe donc
 * par un fetch() authentifie direct. L'autorisation reste entierement cote serveur —
 * ce helper ne fait aucun controle d'acces de son cote.
 */
export async function downloadAuthenticatedFile(
  path: string,
  token: string,
  fileName?: string | null,
  errorMessage = "Impossible de telecharger le fichier.",
): Promise<void> {
  const response = await fetch(`${API_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName || "document";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}
