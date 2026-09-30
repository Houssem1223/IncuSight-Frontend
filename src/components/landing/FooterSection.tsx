import Link from "next/link";
import { ArrowUpRight, Rocket } from "lucide-react";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";
import { FOODSTART_URL, MEDIANET_INCUBATOR_URL, MEDIANET_URL, landingNavItems } from "./landing-content";

// Aucune coordonnee : le contact passe par le formulaire du site officiel.
// Les liens « Mentions legales » et « Politique » (href="#") ont ete retires :
// ces pages n'existent pas.
const externalLinks = [
  { label: "MEDIANET Incubateur", href: MEDIANET_INCUBATOR_URL },
  { label: "Programme FoodStart", href: FOODSTART_URL },
  { label: "Site de MEDIANET", href: MEDIANET_URL },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-ink/8 bg-white" id="contact">
      <div className="lp-container grid gap-12 py-14 md:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(0,1fr))] md:py-16">
        <div>
          <Link aria-label="IncuSight by MEDIANET, accueil" className="flex w-fit items-center gap-3" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
              <Rocket aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-ink">IncuSight</span>
              <span className="block text-[11px] text-ink/55">by MEDIANET</span>
            </span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink/60">
            La plateforme digitale de gestion et de suivi d&apos;incubation de MEDIANET.
          </p>
        </div>

        <nav aria-label="Plan du site">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Plateforme</p>
          <ul className="mt-4 space-y-1">
            {landingNavItems.map((item) => (
              <li key={item.href}>
                <a className="inline-flex min-h-10 items-center text-sm text-ink/70 transition-colors hover:text-ink md:min-h-8" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link className="inline-flex min-h-10 items-center text-sm text-ink/70 transition-colors hover:text-ink md:min-h-8" href="/startups">
                Startups accompagnées
              </Link>
            </li>
            <li>
              <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-strong md:min-h-8" href={LANDING_LOGIN_ROUTE}>
                Connexion
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Contact</p>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">
            Pour toute demande, contactez MEDIANET depuis son site officiel.
          </p>
          <ul className="mt-3 space-y-1">
            {externalLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm text-ink/70 transition-colors hover:text-ink md:min-h-8"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/8">
        <p className="lp-container py-6 text-xs text-ink/50">© 2026 IncuSight by MEDIANET</p>
      </div>
    </footer>
  );
}
