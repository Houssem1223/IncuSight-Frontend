import AuthPageShell from "@/src/components/auth/AuthPageShell";
import ResetPasswordForm from "@/src/components/auth/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const parameters = await searchParams;
  const token = typeof parameters.token === "string" ? parameters.token : undefined;

  return (
    <AuthPageShell>
      <ResetPasswordForm key={token || "missing-token"} token={token} />
    </AuthPageShell>
  );
}
