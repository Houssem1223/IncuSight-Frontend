import Link from "next/link";
import { Rocket } from "lucide-react";

type AuthPageShellProps = {
  children: React.ReactNode;
};

export default function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-transparent to-sky-50" />
      <div className="relative w-full max-w-xl">
        <Link
          className="mx-auto mb-6 flex w-fit items-center gap-3 rounded-xl px-3 py-2 text-foreground transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          href="/"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold">IncuSight</span>
            <span className="block text-xs text-foreground-muted">by MEDIANET</span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
