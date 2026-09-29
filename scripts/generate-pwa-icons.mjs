// Genere les icones PWA a partir de la marque reelle d'IncuSight : le carre
// arrondi `--brand` (#f97316) contenant l'icone Lucide `Rocket` en blanc, tel
// qu'affiche dans LandingHeader et AuthPageShell. Aucun fichier logo n'existe
// dans le depot, d'ou cette generation.
//
// Usage : node scripts/generate-pwa-icons.mjs
// `sharp` est une dependance de `next` : il n'est pas ajoute au package.json.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BRAND = "#f97316";

// Traces de lucide-react 1.16 (`rocket`), viewBox 24x24, stroke 2.
const ROCKET_PATHS = [
  "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09",
  "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z",
  "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05",
];

/**
 * @param {number} size taille finale en pixels
 * @param {{ radius: number; glyph: number }} shape rayon et taille du glyphe,
 *   en proportion du cote
 */
function brandSvg(size, { radius, glyph }) {
  const glyphSize = size * glyph;
  const offset = (size - glyphSize) / 2;
  const scale = glyphSize / 24;
  const paths = ROCKET_PATHS.map((d) => `<path d="${d}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${BRAND}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;
}

const png = (size, shape) =>
  sharp(Buffer.from(brandSvg(size, shape))).png({ compressionLevel: 9 }).toBuffer();

// Meme proportions que la marque a l'ecran : 20 px de glyphe dans 40 px.
const ROUNDED = { radius: 0.22, glyph: 0.5 };
// iOS et les masques Android arrondissent eux-memes : fond plein, et glyphe
// contenu dans la zone sure (cercle de 80 % du cote) pour le maskable.
const FULL_BLEED = { radius: 0, glyph: 0.5 };
const MASKABLE = { radius: 0, glyph: 0.42 };

/** ICO contenant des images PNG (format accepte par tous les navigateurs). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const root = path.resolve(import.meta.dirname, "..");
const iconsDir = path.join(root, "public", "icons");
await mkdir(iconsDir, { recursive: true });

await writeFile(path.join(iconsDir, "icon-192.png"), await png(192, ROUNDED));
await writeFile(path.join(iconsDir, "icon-512.png"), await png(512, ROUNDED));
await writeFile(path.join(iconsDir, "icon-maskable-512.png"), await png(512, MASKABLE));
await writeFile(path.join(iconsDir, "apple-touch-icon.png"), await png(180, FULL_BLEED));

const favicon = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(size, ROUNDED) })),
);
await writeFile(path.join(root, "src", "app", "favicon.ico"), ico(favicon));

console.log("Icones PWA generees dans public/icons et src/app/favicon.ico");
