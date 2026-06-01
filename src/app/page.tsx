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

export default function Home() {
  return (
    <main className="bg-background px-4 pb-20 pt-0 text-foreground md:px-0 md:pb-0 md:pt-0">
      <LandingHeader />
      <HeroSection />
      <MissionSection />
      <FeaturesSection />
      <IncubationJourneySection />
      <WhyChooseSection />
      <FinalCTASection />
      <FooterSection />
    </main>
  );
}
