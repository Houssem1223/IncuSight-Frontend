import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";
import HeroProductPreview from "./HeroProductPreview";

// Le formulaire de connexion a quitte le hero : il s'ouvre en dialogue via
// ?auth=login|signup (LandingAuthDialog), routes d'authentification inchangees.
export default function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="lp-grid-bg absolute inset-0" />
      <div aria-hidden="true" className="absolute -right-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-orange-200/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -left-40 top-64 h-[22rem] w-[22rem] rounded-full bg-ocean-soft blur-3xl" />

      <div className="lp-container relative grid items-center gap-14 pb-20 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:pb-28 lg:pt-24">
        <div className="lp-enter">
          <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-strong sm:text-xs">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
            IncuSight | Digital Incubator Platform
          </p>

          <h1
            className="mt-6 text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl lg:text-[3.3rem] xl:text-[3.6rem]"
            id="hero-title"
          >
            Accélérez les décisions d&apos;incubation avec une{" "}
            <span className="text-brand">gouvernance claire.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">
            Une plateforme digitale pour centraliser les candidatures, les évaluations et le suivi
            des startups au sein de l&apos;écosystème d&apos;incubation.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="lp-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.7)] transition hover:bg-brand-strong"
              href={LANDING_LOGIN_ROUTE}
            >
              Découvrir la plateforme
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a
              className="inline-flex h-12 items-center justify-center rounded-xl border border-ink/12 bg-white px-6 text-sm font-semibold text-ink transition hover:border-ink/25"
              href="#a-propos"
            >
              À propos de MEDIANET
            </a>
          </div>

          <p className="mt-8 text-sm text-ink/55">
            Développée pour <span className="font-semibold text-ink">MEDIANET Incubateur</span>.
          </p>
        </div>

        <div className="lp-enter lp-enter-delay lg:pl-4">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}
