import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { buttonVariants } from "@/src/components/ui/button";
import LandingLoginCard from "@/src/components/landing/LandingLoginCard";
import {
  LANDING_SIGNUP_ROUTE,
  type LandingAuthMode,
} from "@/src/lib/auth-routing";

const heroStats = [
  { label: "Programmes suivis", value: "40+" },
  { label: "Experts mobilises", value: "120" },
  { label: "Dossiers traites", value: "1.8k" },
];

type HeroSectionProps = {
  authMode: LandingAuthMode;
  sessionMessage?: string;
};

export default function HeroSection({
  authMode,
  sessionMessage,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden" id="features">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Rocket className="h-4 w-4" />
              INCUSIGHT | DIGITAL INCUBATOR PLATFORM
            </div>

            <h1 className="text-4xl font-bold leading-tight text-balance text-foreground lg:text-5xl xl:text-6xl">
              Accelerez les decisions d&apos;incubation avec une{" "}
              <span className="text-primary">gouvernance claire.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              IncuSight connecte candidatures, evaluations, suivi startup et pilotage de programmes
              dans une interface corporate, moderne et orientee execution.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                className={buttonVariants({ size: "lg", className: "gap-2" })}
                href={LANDING_SIGNUP_ROUTE}
              >
                Commencer votre candidature
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className={buttonVariants({ size: "lg", variant: "outline", className: "gap-2" })}
                href="#modules"
              >
                Decouvrir les programmes
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 border-t border-border pt-8">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:pl-8">
            <LandingLoginCard
              initialMode={authMode}
              key={authMode}
              sessionMessage={sessionMessage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
