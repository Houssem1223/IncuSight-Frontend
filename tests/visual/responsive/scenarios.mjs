/**
 * Etats interactifs sur mobile : tiroir de navigation, menus, popovers, modales
 * et formulaires, pilotes au doigt (evenements souris a la position de
 * l'element). Chaque couche ouverte doit tenir dans l'ecran, garder son bouton
 * de fermeture visible et ses actions atteignables en faisant defiler le panneau.
 *
 * Meme prerequis que audit.mjs. Usage : node tests/visual/responsive/scenarios.mjs [filtre]
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStack, sessionScript } from "./audit.mjs";
import { launchChrome, pause } from "./cdp.mjs";
import { sessions } from "./routes.mjs";

const APP = "http://127.0.0.1:3107";
const byText = (text, selector = "button,a,summary") => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((el) => el.textContent.trim().includes(${JSON.stringify(text)}) && el.getClientRects().length)`;
const DIALOG = "[...document.querySelectorAll('[role=dialog]')].filter((el) => !el.classList.contains('app-sidebar')).at(-1)";

const scenarios = [
  { name: "drawer-admin", session: "admin", path: "/dashboard/admin/applications", trigger: "document.querySelector('.app-hamburger')", layer: "document.querySelector('.app-sidebar[data-open=true]')", then: [{ tap: "document.querySelector('.app-account-button')", layer: "document.querySelector('.app-account-popover')", name: "account-popover" }] },
  { name: "drawer-startup", session: "startup", path: "/dashboard/startup", trigger: "document.querySelector('.app-hamburger')", layer: "document.querySelector('.app-sidebar[data-open=true]')" },
  { name: "drawer-evaluator", session: "evaluator", path: "/dashboard/evaluateur", trigger: "document.querySelector('.app-hamburger')", layer: "document.querySelector('.app-sidebar[data-open=true]')" },
  { name: "notifications-dropdown", session: "admin", path: "/dashboard/admin", trigger: "document.querySelector('.app-header-actions [aria-label=Notifications]')", layer: "document.querySelector('.app-notification-popover')", then: [{ tap: "document.querySelector('.app-notification-popover li button')", layer: DIALOG, name: "notification-detail" }] },
  { name: "program-create", session: "admin", path: "/dashboard/admin/program", trigger: byText("Creer un programme"), layer: DIALOG },
  { name: "program-edit", session: "admin", path: "/dashboard/admin/program", trigger: byText("Modifier"), layer: DIALOG },
  { name: "user-create", session: "admin", path: "/dashboard/admin/users", trigger: byText("Creer un utilisateur"), layer: DIALOG },
  { name: "user-edit", session: "admin", path: "/dashboard/admin/users", trigger: byText("Modifier"), layer: DIALOG },
  { name: "application-revise", session: "admin", path: "/dashboard/admin/applications", trigger: byText("Reviser"), layer: DIALOG },
  // La decision s'ouvre apres le choix d'un statut dans le select de la ligne.
  { name: "application-decide", session: "admin", path: "/dashboard/admin/applications?status=PENDING", prepare: "(() => { const select = document.querySelector('table select:not([disabled])'); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, 'ACCEPTED'); select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()", trigger: byText("Enregistrer"), layer: DIALOG },
  { name: "objective-create", session: "admin", path: "/dashboard/admin/incubation-followups?followUp=f1&tab=objectives", trigger: byText("Ajouter un objectif"), layer: DIALOG },
  { name: "startup-update", session: "startup", path: "/dashboard/startup", trigger: byText("Nouveau compte rendu"), layer: DIALOG },
  { name: "startup-create", session: "startup", path: "/dashboard/startup/applications", trigger: byText("Ajouter une startup"), layer: DIALOG },
  { name: "startup-edit", session: "startup", path: "/dashboard/startup/applications", trigger: byText("Modifier"), layer: DIALOG },
  { name: "startup-delete-confirm", session: "startup", path: "/dashboard/startup/applications", trigger: byText("Supprimer"), layer: DIALOG },
  { name: "evaluation-form", session: "evaluator", path: "/dashboard/evaluateur/reviews", trigger: byText("AgriSmart"), layer: "document.querySelector('form')" },
  // Candidature : formulaire integre a la carte du programme, pas une modale.
  { name: "program-apply", session: "startupNew", path: "/dashboard/startup/programs", trigger: "document.querySelector('textarea')", layer: "document.querySelector('textarea').closest('article') || document.querySelector('textarea').parentElement" },
  // PWA : la carte d'installation ne doit jamais recouvrir le tiroir ouvert.
  { name: "pwa-install-under-drawer", session: "admin", path: "/dashboard/admin/notifications", prepare: "(() => { localStorage.removeItem('incusight:pwa-install-dismissed-at'); const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); return true; })()", trigger: "document.querySelector('.pwa-prompt') && document.querySelector('.app-hamburger')", layer: "document.querySelector('.app-sidebar[data-open=true]')", check: "(() => { const card = document.querySelector('.pwa-prompt').getBoundingClientRect(); const top = document.elementFromPoint(Math.min(card.left + 20, 200), card.top + card.height / 2); return Boolean(top && top.closest('.app-sidebar, .app-sidebar-overlay')); })()" },
  { name: "signup-form", session: "public", path: "/?auth=signup#landing-login", trigger: "document.querySelector('input[type=email]')", layer: "document.querySelector('input[type=email]').closest('form')" },
];

const MEASURE_LAYER = (layer) => String.raw`(() => {
  const el = ${layer};
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth, vh = innerHeight;
  const closers = [...el.querySelectorAll('button')].filter((b) => /fermer|close|annuler/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent) || b.textContent.trim() === 'x');
  const closer = closers[0]?.getBoundingClientRect();
  const scroller = [el, ...el.querySelectorAll('*')].find((node) => { const s = getComputedStyle(node); return /(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 1; });
  const tiny = [...el.querySelectorAll('button,a[href],input,select,textarea')].filter((b) => b.getClientRects().length).map((b) => b.getBoundingClientRect()).filter((b) => Math.min(b.width, b.height) < 40).length;
  return {
    left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw, vh,
    fitsX: r.left >= -1 && r.right <= vw + 1, fitsY: r.top >= -1 && r.bottom <= vh + 1,
    closerVisible: closer ? closer.top >= 0 && closer.bottom <= vh && closer.left >= 0 && closer.right <= vw : null,
    closerSize: closer ? Math.round(closer.width) + 'x' + Math.round(closer.height) : null,
    scrollable: Boolean(scroller), docOverflow: document.documentElement.scrollWidth - vw, targetsUnder40: tiny,
  };
})()`;

const output = await mkdtemp(join(tmpdir(), "incusight-scenarios-"));
await mkdir(join(output, "shots"));
const filter = process.argv[2];
const stack = await startStack();
const chrome = await launchChrome({ port: 9234, profileDir: join(output, "profile") });
const results = [];
try {
  const page = await chrome.openPage();
  let scriptId = null;
  for (const scenario of scenarios.filter((s) => !filter || s.name.includes(filter))) {
    for (const [width, height] of [[390, 844], [320, 568]]) {
      if (scriptId) await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId });
      ({ identifier: scriptId } = await page.send("Page.addScriptToEvaluateOnNewDocument", { source: sessionScript(sessions[scenario.session]) }));
      await page.setViewport(width, height);
      await page.navigate(`${APP}${scenario.path}`);
      if (scenario.prepare) { await page.waitFor("document.querySelector('.app-sidebar, form, main')", 8000); await page.evaluate(scenario.prepare); await pause(300); }
      await page.waitFor(scenario.trigger, 8000);
      const tapped = await page.tap(scenario.name.startsWith("pwa-") ? "document.querySelector('.app-hamburger')" : scenario.trigger);
      await page.waitFor(scenario.layer, 4000);
      await pause(450);
      const metrics = tapped ? await page.evaluate(MEASURE_LAYER(scenario.layer)) : null;
      const base = `${scenario.name}__${width}`;
      await page.screenshot(join(output, "shots", `${base}.png`));
      // Fin du panneau : les actions doivent y etre atteignables.
      await page.evaluate(`(() => { const el = ${scenario.layer}; if (!el) return; for (const node of [el, ...el.querySelectorAll('*')]) { if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) node.scrollTop = node.scrollHeight; } })()`);
      await pause(200);
      await page.screenshot(join(output, "shots", `${base}-end.png`));
      const checked = scenario.check ? await page.evaluate(scenario.check) : undefined;
      results.push({ scenario: scenario.name, width, tapped, opened: Boolean(metrics), checked, ...metrics });
      console.log(`${scenario.name.padEnd(24)} ${width}  ${metrics ? JSON.stringify(metrics) : "NON OUVERT"}${checked === undefined ? "" : ` check=${checked}`}`);
      for (const next of scenario.then ?? []) {
        const ok = await page.tap(next.tap);
        await page.waitFor(next.layer, 4000);
        await pause(400);
        const nested = ok ? await page.evaluate(MEASURE_LAYER(next.layer)) : null;
        await page.screenshot(join(output, "shots", `${next.name}__${width}.png`));
        results.push({ scenario: next.name, width, tapped: ok, opened: Boolean(nested), ...nested });
        console.log(`${next.name.padEnd(24)} ${width}  ${nested ? JSON.stringify(nested) : "NON OUVERT"}`);
      }
    }
  }
} finally {
  await writeFile(join(output, "scenarios.json"), JSON.stringify(results, null, 2));
  await chrome.close();
  await stack.stop();
  console.log(`Resultats : ${output}`);
}
