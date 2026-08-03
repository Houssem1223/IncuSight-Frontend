export const VERIFICATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export const PASSWORD_REQUIREMENTS = [
  "8 à 128 caractères",
  "une lettre majuscule",
  "une lettre minuscule",
  "un chiffre",
  "un symbole",
] as const;

export type SignupFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignupFieldErrors = Partial<Record<keyof SignupFormValues, string>>;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (password.length > 128) {
    return "Le mot de passe ne doit pas dépasser 128 caractères.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }

  if (!/[a-z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }

  if (!/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Le mot de passe doit contenir au moins un symbole.";
  }

  return null;
}

export function validateSignupForm(values: SignupFormValues): SignupFieldErrors {
  const errors: SignupFieldErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Le prénom est obligatoire.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Le nom est obligatoire.";
  }

  if (!values.email.trim()) {
    errors.email = "L’adresse email est obligatoire.";
  } else if (!isValidEmail(values.email)) {
    errors.email = "Saisissez une adresse email valide.";
  }

  if (!values.password) {
    errors.password = "Le mot de passe est obligatoire.";
  } else {
    const passwordError = getPasswordValidationError(values.password);

    if (passwordError) {
      errors.password = passwordError;
    }
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "La confirmation du mot de passe est obligatoire.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }

  return errors;
}

export function isVerificationTokenValid(token: string | null | undefined): token is string {
  return typeof token === "string" && VERIFICATION_TOKEN_PATTERN.test(token);
}
