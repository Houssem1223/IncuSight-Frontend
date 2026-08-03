import {
  FooterSection,
  LandingHeader,
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  IncubationJourneySection,
  MissionSection,
  WhyChooseSection,
} from "@/src/components/landing";
import { SESSION_EXPIRED_MESSAGE } from "@/src/lib/api";
import { getLandingAuthMode } from "@/src/lib/auth-routing";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const parameters = await searchParams;
  const sessionExpired = parameters.sessionExpired === "1";
  const authMode = sessionExpired
    ? "login"
    : getLandingAuthMode(parameters.auth);

  return (
    <main className="bg-background px-4 pb-20 pt-0 text-foreground md:px-0 md:pb-0 md:pt-0">
      <LandingHeader />
      <HeroSection
        authMode={authMode}
        sessionMessage={sessionExpired ? SESSION_EXPIRED_MESSAGE : undefined}
      />
      <MissionSection />
      <FeaturesSection />
      <IncubationJourneySection />
      <WhyChooseSection />
      <FinalCTASection />
      <FooterSection />
    </main>
  );
}
