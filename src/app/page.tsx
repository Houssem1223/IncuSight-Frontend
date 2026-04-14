import {
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  IncubationJourneySection,
  MissionSection,
  ProgramsPreviewSection,
  WhyChooseSection,
} from "@/src/components/landing";

export default function Home() {
  return (
    <main className="px-4 pb-20 pt-6 md:px-8 md:pb-28 md:pt-8">
      <HeroSection />
      <MissionSection />
      <FeaturesSection />
      <IncubationJourneySection />
      <ProgramsPreviewSection />
      <WhyChooseSection />
      <FinalCTASection />
    </main>
  );
}
