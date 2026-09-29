import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";
import { OFFLINE_ROUTE } from "@/src/lib/pwa";

// Genere au build (route force-static) : /serwist/sw.js et sa source map.
// La revision de la page hors ligne change a chaque build, pour qu'elle ne
// reference jamais des chunks d'une version precedente. Le SHA git n'est pas
// utilise : le build Docker n'a pas acces a .git, et un arbre modifie garderait
// le meme SHA.
const revision = randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/sw.ts",
    additionalPrecacheEntries: [{ url: OFFLINE_ROUTE, revision }],
    // esbuild natif (devDependency) : la variante wasm n'est pas installee.
    useNativeEsbuild: true,
    // Script classique plutot que module : les service workers en module ne
    // sont pas pris en charge par tous les navigateurs cibles.
    esbuildOptions: { format: "iife" },
    // Assets immuables du build (noms hashes) et icones de l'application.
    // Les SVG de demonstration de public/ ne sont utilises nulle part.
    globPatterns: [
      ".next/static/**/*.{js,css,woff2}",
      "public/icons/**/*.png",
    ],
  });
