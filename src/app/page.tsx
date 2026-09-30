import type { Metadata } from "next";
import {
  AiSection,
  FinalCtaSection,
  FollowUpSection,
  FooterSection,
  GovernanceSection,
  HeroSection,
  JourneySection,
  KeyFiguresSection,
  LandingAuthDialog,
  LandingHeader,
  LandingReveal,
  LandingSessionRedirect,
  MedianetSection,
  PlatformSection,
  ProgramsSection,
  RolesSection,
} from "@/src/components/landing";
import { SESSION_EXPIRED_MESSAGE } from "@/src/lib/api";
import { getLandingAuthMode } from "@/src/lib/auth-routing";

const TITLE = "IncuSight | Plateforme digitale d'incubation";
const DESCRIPTION =
  "Centralisez les candidatures, les évaluations et le suivi des startups avec IncuSight, la plateforme digitale d'incubation de MEDIANET.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "IncuSight",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const parameters = await searchParams;
  const sessionExpired = parameters.sessionExpired === "1";
  // Les routes d'authentification existantes (/login, ?auth=, session expiree,
  // lien de verification d'email) ouvrent le formulaire en dialogue.
  const isAuthRequested = sessionExpired || parameters.auth !== undefined;
  const authMode = sessionExpired ? "login" : getLandingAuthMode(parameters.auth);

  return (
    <div className="lp">
      <LandingHeader />
      <main>
        <HeroSection />
        <PlatformSection />
        <MedianetSection />
        <KeyFiguresSection />
        <ProgramsSection />
        <JourneySection />
        <RolesSection />
        <FollowUpSection />
        <AiSection />
        <GovernanceSection />
        <FinalCtaSection />
      </main>
      <FooterSection />

      {isAuthRequested && (
        <LandingAuthDialog
          mode={authMode}
          sessionMessage={sessionExpired ? SESSION_EXPIRED_MESSAGE : undefined}
        />
      )}
      <LandingReveal />
      <LandingSessionRedirect />
    </div>
  );
}
