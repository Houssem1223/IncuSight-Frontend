import assert from "node:assert/strict";
import test from "node:test";

/**
 * PWA : le service worker ne doit jamais capter l'API (origine distincte), ni
 * mettre en cache une page ; la proposition d'installation suit les regles
 * iOS/standalone. Voir docs/pwa.md.
 */

const { isAppIcon, isAppNavigation, isImmutableBuildAsset } = await import(
  "../src/lib/pwa-cache-rules.ts"
);
const {
  INSTALL_DISMISS_DURATION_MS,
  PWA_THEME_COLOR,
  isInstallDismissed,
  isIosDevice,
} = await import("../src/lib/pwa.ts");
const { default: manifest } = await import("../src/app/manifest.ts");

const APP = "https://incusight.example";
const API = "https://api.incusight.example";
const rules = [isImmutableBuildAsset, isAppIcon, isAppNavigation];

function input(href, mode = "cors") {
  const url = new URL(href);
  return { url, sameOrigin: url.origin === APP, request: { mode } };
}

test("aucune regle du service worker ne capte l'API backend", () => {
  const apiRequests = [
    `${API}/auth/sign-in`,
    `${API}/auth/refresh-token`,
    `${API}/users/me`,
    `${API}/application?page=1`,
    `${API}/evaluation/me`,
    `${API}/program/public`,
    `${API}/notifications`,
    `${API}/incubation-followups/me`,
    `${API}/startup/public/1/logo.png`,
    `${API}/reports/applications.csv`,
    `${API}/_next/static/chunk.js`,
  ];
  for (const href of apiRequests) {
    for (const mode of ["cors", "navigate", "no-cors"]) {
      assert.equal(rules.some((rule) => rule(input(href, mode))), false, `${href} (${mode})`);
    }
  }
});

test("les requetes RSC et les fetch du frontend ne sont pas interceptees", () => {
  for (const href of [`${APP}/dashboard/admin?_rsc=abc`, `${APP}/manifest.webmanifest`, `${APP}/serwist/sw.js`]) {
    assert.equal(rules.some((rule) => rule(input(href))), false, href);
  }
});

test("seuls les assets hashes du build et les icones sont mis en cache", () => {
  assert.equal(isImmutableBuildAsset(input(`${APP}/_next/static/chunks/app.js`)), true);
  assert.equal(isImmutableBuildAsset(input(`${APP}/dashboard/admin`)), false);
  assert.equal(isAppIcon(input(`${APP}/icons/icon-192.png`)), true);
  assert.equal(isAppIcon(input(`${APP}/favicon.ico`)), true);
  assert.equal(isAppIcon(input(`${APP}/uploads/logo.png`)), false);
});

test("les navigations du frontend passent par la regle reseau uniquement", () => {
  assert.equal(isAppNavigation(input(`${APP}/dashboard/startup`, "navigate")), true);
  assert.equal(isAppNavigation(input(`${APP}/dashboard/startup`, "cors")), false);
  assert.equal(isImmutableBuildAsset(input(`${APP}/dashboard/startup`, "navigate")), false);
});

test("iOS et iPadOS sont detectes, pas Android ni un Mac sans ecran tactile", () => {
  assert.equal(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5), true);
  assert.equal(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true);
  assert.equal(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);
  assert.equal(isIosDevice("Mozilla/5.0 (Linux; Android 15; Pixel 9)", 5), false);
});

test("la proposition d'installation refusee reste masquee 30 jours", () => {
  const now = Date.UTC(2026, 8, 29);
  assert.equal(isInstallDismissed(null, now), false);
  assert.equal(isInstallDismissed("pas-une-date", now), false);
  assert.equal(isInstallDismissed(String(now - 1000), now), true);
  assert.equal(isInstallDismissed(String(now - INSTALL_DISMISS_DURATION_MS - 1), now), false);
});

test("le manifest decrit IncuSight installable en standalone", () => {
  const data = manifest();
  assert.equal(data.name, "IncuSight");
  assert.equal(data.short_name, "IncuSight");
  assert.equal(data.description, "Plateforme de gestion et de suivi d'incubation");
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.equal(data.theme_color, PWA_THEME_COLOR);
  assert.equal(data.background_color, "#ffffff");
  const icons = data.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
  assert.deepEqual(icons, ["192x192:any", "512x512:any", "512x512:maskable"]);
});
