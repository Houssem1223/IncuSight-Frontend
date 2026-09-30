import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";
import { MEDIANET_URL } from "./landing-content";

export default function FinalCtaSection() {
  return (
    <section aria-labelledby="cta-title" className="lp-section">
      <div className="lp-container">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-ocean-soft px-6 py-14 text-center sm:px-10 md:py-20"
          data-reveal
        >
          <div aria-hidden="true" className="lp-grid-bg absolute inset-0" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-4xl md:text-[2.6rem]" id="cta-title">
              Prêt à structurer votre prochaine incubation ?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/65 md:text-lg">
              Centralisez vos programmes, accompagnez vos startups et gardez une vision claire de
              chaque étape.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                className="lp-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.7)] transition hover:bg-brand-strong"
                href={LANDING_LOGIN_ROUTE}
              >
                Accéder à IncuSight
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                className="lp-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-ink/12 bg-white px-6 text-sm font-semibold text-ink transition hover:border-ink/25"
                href={MEDIANET_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                Découvrir MEDIANET
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
