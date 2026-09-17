import type { Metadata } from "next";
import { FooterSection, LandingHeader } from "@/src/components/landing";
import ShowcaseGrid from "@/src/components/showcase/ShowcaseGrid";

export const metadata: Metadata = {
  title: "Portefeuille de startups | IncuSight",
  description:
    "Les startups accompagnées par l'incubateur MEDIANET : portefeuille en cours et alumni.",
};

export default function PublicShowcasePage() {
  return (
    <>
      <LandingHeader />

      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
          MEDIANET incubateur
        </p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Les startups que nous accompagnons
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">
          Chaque profil est publié avec l&apos;accord de la startup concernée.
        </p>

        <div className="mt-12">
          <ShowcaseGrid />
        </div>
      </main>

      <FooterSection />
    </>
  );
}
