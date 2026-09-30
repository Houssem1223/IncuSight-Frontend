// Contenus institutionnels de la landing. REGLE : aucune donnee inventee.
// Chaque chiffre vient d'une page officielle de MEDIANET, citee ici, et reste
// attribue a MEDIANET ou a FoodStart a l'ecran, jamais a IncuSight.
// Verifie le 30/09/2026. Voir docs/landing-page.md.

export const MEDIANET_URL = "https://www.medianet-group.com";
export const MEDIANET_INCUBATOR_URL = "https://www.medianet-group.com/fr/medianet-incubateur";
export const FOODSTART_URL = "https://www.medianet-group.com/fr/foodstart-";

// Navigation (header, menu mobile, footer). Ancres absolues : le header est
// partage avec /startups, ou « #features » pointait vers une section absente.
export const landingNavItems = [
  { label: "Fonctionnalités", href: "/#fonctionnalites" },
  { label: "Modules", href: "/#modules" },
  { label: "À propos", href: "/#a-propos" },
  { label: "Contact", href: "/#contact" },
];

export type KeyFigure = { value: string; label: string; scope: string };

// « plus de 25 ans d'expertise digitale et sectorielle » : page MEDIANET Incubateur.
// Les cinq autres : page FoodStart, premiere cohorte.
export const keyFigures: KeyFigure[] = [
  { value: "+25 ans", label: "d'expertise digitale et sectorielle", scope: "MEDIANET" },
  { value: "8", label: "startups accompagnées lors de la première cohorte", scope: "FoodStart" },
  { value: "2", label: "startups ayant obtenu le Label Startup", scope: "FoodStart" },
  { value: "7", label: "startups commercialisant leurs produits", scope: "FoodStart" },
  { value: "2", label: "levées de fonds finalisées", scope: "FoodStart" },
  { value: "22", label: "sessions collectives, one-to-one et workshops", scope: "FoodStart" },
];

// Elements publies sur la page FoodStart.
export const foodStart = {
  name: "FoodStart",
  sector: "FoodTech · Tunisie",
  duration: "Programme de 6 mois",
  description: "Programme d'incubation dédié à la FoodTech en Tunisie.",
  highlights: [
    "Accompagnement au prototypage",
    "Accès au marché et plateformes de test",
    "Expertise commercialisation, branding et marketing",
    "Mentoring : 10 h de one-to-one par mois",
    "Réseau de partenaires",
    "Accès au Startup Village",
  ],
};
