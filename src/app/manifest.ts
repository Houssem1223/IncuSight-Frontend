import type { MetadataRoute } from "next";
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR } from "@/src/lib/pwa";

// Servi par Next a /manifest.webmanifest, et reference automatiquement dans le
// <head> de toutes les pages.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "IncuSight",
    short_name: "IncuSight",
    description: "Plateforme de gestion et de suivi d'incubation",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
