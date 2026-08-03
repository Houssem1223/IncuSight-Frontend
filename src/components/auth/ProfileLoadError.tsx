import { Button } from "@/src/components/ui/button";

type ProfileLoadErrorProps = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

export default function ProfileLoadError({
  message,
  isRetrying,
  onRetry,
}: ProfileLoadErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section
        aria-labelledby="profile-load-error-title"
        className="w-full max-w-md rounded-2xl border border-border/80 bg-surface p-6 text-center shadow-[var(--shadow-soft)]"
      >
        <h1 className="text-lg font-semibold text-foreground" id="profile-load-error-title">
          Profil indisponible
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground-muted" role="alert">
          {message}
        </p>
        <Button
          className="mt-5"
          disabled={isRetrying}
          onClick={onRetry}
          type="button"
        >
          {isRetrying ? "Nouvelle tentative..." : "Réessayer"}
        </Button>
      </section>
    </main>
  );
}
