import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import AuthPageShell from "@/src/components/auth/AuthPageShell";
import OfflineRetryButton from "@/src/components/pwa/OfflineRetryButton";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

// Page precachee par le service worker et renvoyee a la place de toute
// navigation qui echoue faute de reseau. Statique et sans aucune donnee
// metier : rien n'y est simule hors ligne.
export const metadata: Metadata = {
  title: "Hors ligne | IncuSight",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <AuthPageShell>
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-brand">
            <WifiOff className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            IncuSight est temporairement hors ligne
          </h1>
          <p className="text-sm leading-6 text-foreground-muted">
            La connexion au réseau est indisponible. Vos données n&apos;ont pas été
            modifiées : elles s&apos;afficheront dès que la connexion sera rétablie.
          </p>
        </CardHeader>
        <CardContent>
          <OfflineRetryButton />
          <p className="mt-4 text-center text-xs text-foreground-muted">
            La page se rechargera automatiquement au retour du réseau.
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
