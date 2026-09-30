/**
 * Recette de la landing publique sur le build de production (meme prerequis
 * que audit.mjs) : 6 largeurs, sections apparues, debordement, console
 * (hydratation comprise), liens et ancres, CTA et dialogue d'authentification.
 * Usage : node tests/visual/responsive/landing.mjs
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { startStack, sessionScript } from "./audit.mjs";
import { launchChrome, pause } from "./cdp.mjs";

const APP = "http://127.0.0.1:3107";
const SCROLL_THROUGH = "(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 50)); } await new Promise((r) => setTimeout(r, 900)); scrollTo({ top: 0, behavior: 'instant' }); })()";

const output = await mkdtemp(join(tmpdir(), "incusight-landing-"));
await mkdir(join(output, "shots"));
const stack = await startStack();
const chrome = await launchChrome({ port: 9236, profileDir: join(output, "profile") });
const results = [];
const check = async (name, run) => {
  try { const detail = await run(); results.push({ name, ok: true, detail }); console.log(`OK   ${name}${detail ? " -> " + JSON.stringify(detail) : ""}`); }
  catch (error) { results.push({ name, ok: false, detail: String(error.message ?? error) }); console.log(`FAIL ${name}\n     ${error.message ?? error}`); }
};

try {
  const page = await chrome.openPage();
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: sessionScript(null) });

  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [768, 1024], [430, 932], [390, 844]]) {
    await check(`largeur ${width}`, async () => {
      await page.setViewport(width, height);
      const before = page.consoleMessages.length;
      await page.navigate(`${APP}/`);
      await page.evaluate(SCROLL_THROUGH);
      await pause(300);
      const state = await page.evaluate(`({ overflow: document.documentElement.scrollWidth - innerWidth, hidden: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length, sections: document.querySelectorAll('main > section').length, h1: document.querySelectorAll('h1').length, height: document.documentElement.scrollHeight })`);
      await page.screenshot(join(output, "shots", `landing-${width}.png`), { fullPage: true, maxHeight: 20000 });
      assert.equal(state.overflow, 0, "debordement horizontal");
      assert.equal(state.hidden, 0, "section restee invisible");
      assert.equal(state.h1, 1, "un seul h1");
      assert.deepEqual(page.consoleMessages.slice(before), [], "messages console");
      return state;
    });
  }

  await check("ancres et liens internes", async () => {
    await page.setViewport(1440, 900);
    await page.navigate(`${APP}/`);
    const links = await page.evaluate(`[...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))`);
    const anchors = [...new Set(links.filter((href) => href.includes("#") && (href.startsWith("#") || href.startsWith("/#"))).map((href) => href.split("#")[1]))];
    const missing = await page.evaluate(`${JSON.stringify(anchors)}.filter((id) => !document.getElementById(id))`);
    assert.deepEqual(missing, [], "ancres sans section");
    const internal = [...new Set(links.filter((href) => href.startsWith("/") && !href.startsWith("/#")).map((href) => href.split("#")[0]))];
    const statuses = await Promise.all(internal.map(async (href) => [href, (await fetch(APP + href, { redirect: "manual" })).status]));
    const broken = statuses.filter(([, status]) => status >= 400);
    assert.deepEqual(broken, [], "liens internes en erreur");
    const external = [...new Set(links.filter((href) => /^https?:/.test(href)))];
    return { anchors, internal: statuses, external };
  });

  await check("CTA principal : dialogue de connexion, Echap ferme", async () => {
    await page.navigate(`${APP}/`);
    await page.tap(`[...document.querySelectorAll('a')].find((a) => a.textContent.includes('Découvrir la plateforme'))`);
    await page.waitFor("document.querySelector('[role=dialog] input[type=email]')", 8000);
    const focused = await page.evaluate("document.activeElement?.type");
    await page.screenshot(join(output, "shots", "dialog-login-1440.png"));
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await page.waitFor("!document.querySelector('[role=dialog]') && location.search === ''", 8000);
    assert.equal(focused, "email", "focus sur l'email");
    return { focused };
  });

  await check("routes d'authentification existantes", async () => {
    const seen = {};
    for (const route of ["/login", "/?auth=signup#landing-login", "/?auth=login&sessionExpired=1#landing-login"]) {
      await page.navigate(APP + route);
      await page.waitFor("document.querySelector('[role=dialog] input[type=email]')", 8000);
      seen[route] = await page.evaluate("({ path: location.pathname + location.search, text: document.querySelector('[role=dialog]').innerText.slice(0, 80) })");
    }
    assert.ok(seen["/?auth=login&sessionExpired=1#landing-login"].text.length > 0);
    return seen;
  });

  await check("mobile 390 : menu, CTA, dialogue", async () => {
    await page.setViewport(390, 844);
    await page.navigate(`${APP}/`);
    const ctaVisible = await page.evaluate(`Boolean([...document.querySelectorAll('header a')].find((a) => a.textContent.includes('Se connecter') && a.getClientRects().length))`);
    await page.tap("document.querySelector('header button[aria-controls]')");
    await page.waitFor("document.querySelector('header nav[aria-label=\"Navigation principale\"]:not(.hidden)')", 4000);
    await page.screenshot(join(output, "shots", "menu-390.png"));
    await page.tap(`[...document.querySelectorAll('header nav a')].find((a) => a.textContent.includes('Modules') && a.getClientRects().length)`);
    await pause(700);
    const afterMenu = await page.evaluate("({ hash: location.hash, open: document.querySelectorAll('header nav').length })");
    await page.navigate(`${APP}/?auth=login#landing-login`);
    await page.waitFor("document.querySelector('[role=dialog] input[type=email]')", 8000);
    const dialog = await page.evaluate("(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return { left: r.left, right: r.right, overflow: document.documentElement.scrollWidth - innerWidth }; })()");
    await page.screenshot(join(output, "shots", "dialog-login-390.png"));
    assert.equal(ctaVisible, true, "CTA visible");
    assert.equal(afterMenu.hash, "#modules", "ancre atteinte depuis le menu");
    assert.equal(afterMenu.open, 1, "menu referme apres le choix");
    assert.ok(dialog.left >= 0 && dialog.right <= 390, "dialogue dans l'ecran");
    return { ctaVisible, afterMenu, dialog };
  });

  await check("mouvement reduit : tout est visible sans defilement", async () => {
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await page.setViewport(1440, 900);
    await page.navigate(`${APP}/`);
    const hidden = await page.evaluate(`[...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length`);
    await page.send("Emulation.setEmulatedMedia", { features: [] });
    assert.equal(hidden, 0);
    return { hidden };
  });

  await check("PWA toujours fonctionnelle", async () => {
    await page.setViewport(1440, 900);
    await page.navigate(`${APP}/`);
    await page.waitFor("navigator.serviceWorker.controller", 30000);
    const state = await page.evaluate("navigator.serviceWorker.getRegistration().then((r) => ({ active: r?.active?.state, manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'), theme: document.querySelector('meta[name=theme-color]')?.content }))");
    const statuses = await Promise.all(["/manifest.webmanifest", "/serwist/sw.js", "/offline", "/opengraph-image"].map(async (path) => [path, (await fetch(APP + path)).status]));
    assert.equal(state.active, "activated");
    assert.ok(statuses.every(([, status]) => status === 200), JSON.stringify(statuses));
    return { ...state, statuses };
  });

  await check("aucune exception JS", async () => {
    assert.deepEqual(page.exceptions, []);
  });
} finally {
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  await chrome.close();
  await stack.stop();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} verifications reussies. Captures : ${output}`);
  process.exitCode = failed ? 1 : 0;
}
