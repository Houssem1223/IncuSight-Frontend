export const SIGNUP_SUCCESS_TITLE = "Consultez votre boîte email";
export const SIGNUP_SUCCESS_FALLBACK_MESSAGE =
  "Inscription réussie. Consultez votre email pour vérifier votre compte.";

type SignupSuccessResponse = {
  message?: string;
  user?: {
    email?: string;
  };
};

export type SignupSuccessState = {
  email: string;
  message: string;
};

export function getSignupSuccessState(
  response: SignupSuccessResponse,
  submittedEmail: string,
): SignupSuccessState {
  const normalizedEmail = submittedEmail.trim().toLowerCase();

  return {
    email: response.user?.email?.trim() || normalizedEmail,
    message: response.message?.trim() || SIGNUP_SUCCESS_FALLBACK_MESSAGE,
  };
}
