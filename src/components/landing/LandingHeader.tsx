"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";
import LandingMobileMenu from "./LandingMobileMenu";
import { landingNavItems } from "./landing-content";


export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-ink/10 bg-white/85 shadow-[0_8px_24px_-18px_rgba(7,20,38,0.35)]"
          : "border-transparent bg-white/60"
      }`}
    >
      <div className="lp-container flex h-16 items-center justify-between gap-4">
        <Link aria-label="IncuSight by MEDIANET, accueil" className="flex items-center gap-3" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Rocket aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-ink">IncuSight</span>
            <span className="block text-[11px] text-ink/55">by MEDIANET</span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
          {landingNavItems.map((item) => (
            <a
              className="py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="hidden h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 min-[360px]:inline-flex md:h-9"
            href={LANDING_LOGIN_ROUTE}
          >
            Se connecter
          </Link>
          <LandingMobileMenu items={landingNavItems} />
        </div>
      </div>
    </header>
  );
}
