"use client";

import { useEffect } from "react";

const READY_CLASS = "lp-reveal-ready";

// Apparition des [data-reveal] au defilement. Les elements ne sont masques
// qu'apres l'ajout de .lp-reveal-ready : sans JavaScript, sans
// IntersectionObserver ou avec « mouvement reduit », tout reste visible.
export default function LandingReveal() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    root.classList.add(READY_CLASS);

    return () => {
      observer.disconnect();
      root.classList.remove(READY_CLASS);
    };
  }, []);

  return null;
}
