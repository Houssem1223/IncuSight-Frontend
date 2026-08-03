import AuthPageShell from "@/src/components/auth/AuthPageShell";
import VerifyEmailContent from "@/src/components/auth/VerifyEmailContent";

type VerifyEmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const parameters = await searchParams;
  const token = typeof parameters.token === "string" ? parameters.token : undefined;

  return (
    <AuthPageShell>
      <VerifyEmailContent key={token || "missing-token"} token={token} />
    </AuthPageShell>
  );
}
