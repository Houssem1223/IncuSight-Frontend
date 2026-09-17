/**
 * Miroir client de la politique de mot de passe du backend
 * (`ChangeMyPass.dto.ts` : 8 caracteres minimum, majuscule, minuscule, chiffre,
 * symbole, et 72 octets UTF-8 au plus — limite de bcrypt).
 *
 * Le backend reste l'autorite : ces controles servent a donner un message
 * immediat plutot qu'un 400 apres aller-retour.
 */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT =
  "Au moins 8 caracteres, avec une majuscule, une minuscule, un chiffre et un symbole.";

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le nouveau mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  // La limite bcrypt porte sur les OCTETS, pas les caracteres : un mot de passe
  // de 40 emojis depasse 72 octets tout en paraissant court.
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Le nouveau mot de passe ne doit pas depasser ${PASSWORD_MAX_BYTES} octets UTF-8.`;
  }

  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return "Le nouveau mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.";
  }

  return null;
}
