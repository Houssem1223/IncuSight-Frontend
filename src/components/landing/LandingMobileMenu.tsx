"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";

type LandingMobileMenuProps = {
  items: { label: string; href: string }[];
};

// Sous md, la navigation du header etait simplement masquee : aucune rubrique
// ni acces a la connexion depuis le haut de page sur telephone.
export default function LandingMobileMenu({ items }: LandingMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative md:hidden" ref={container}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink"
        onClick={() => setIsOpen((current) => !current)}
        ref={toggle}
        type="button"
      >
        {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      {isOpen && (
        <nav
          aria-label="Navigation principale"
          className="lp-enter absolute right-0 top-12 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_24px_48px_-24px_rgba(7,20,38,0.4)]"
          id={panelId}
        >
          {items.map((item) => (
            <a
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-canvas"
              href={item.href}
              key={item.label}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <Link
            className="mt-1 flex min-h-11 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-white"
            href={LANDING_LOGIN_ROUTE}
            onClick={() => setIsOpen(false)}
          >
            Se connecter
          </Link>
        </nav>
      )}
    </div>
  );
}
