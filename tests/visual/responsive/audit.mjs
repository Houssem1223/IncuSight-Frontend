/**
 * Audit responsive de toutes les fenetres d'IncuSight, pour chaque role, sur
 * le build de production standalone et une API factice (aucun backend reel).
 *
 * Prerequis : build avec l'API factice
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:8051 npm run build
 * Usage : node tests/visual/responsive/audit.mjs [filtre-de-nom] [--no-shots]
 * Sortie : report.json + captures dans le dossier temporaire affiche.
 */
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApiMock } from "./api-mock.mjs";
import { launchChrome, pause } from "./cdp.mjs";
import { MEASURE } from "./measure.mjs";
import { mobileViewports, otherViewports, routes, screenshotWidths, sessions } from "./routes.mjs";

const ROOT = process.cwd();
const APP_PORT = 3107;
const API_PORT = 8051;
const APP = `http://127.0.0.1:${APP_PORT}`;
const filter = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const shots = !process.argv.includes("--no-shots");

async function assertMockBuild() {
  const dir = join(ROOT, ".next/static/chunks");
  for (const file of await readdir(dir)) {
    if (file.endsWith(".js") && (await readFile(join(dir, file), "utf8")).includes(`127.0.0.1:${API_PORT}`)) return;
  }
  throw new Error(`Le build ne cible pas l'API factice : NEXT_PUBLIC_API_URL=http://127.0.0.1:${API_PORT} npm run build`);
}

export async function startStack() {
  await assertMockBuild();
  await cp(join(ROOT, ".next/static"), join(ROOT, ".next/standalone/.next/static"), { recursive: true, force: true });
  await cp(join(ROOT, "public"), join(ROOT, ".next/standalone/public"), { recursive: true, force: true });
  const api = createApiMock({ port: API_PORT, origin: APP });
  await api.start();
  const app = spawn(process.execPath, [join(ROOT, ".next/standalone/server.js")], { env: { ...process.env, PORT: String(APP_PORT), HOSTNAME: "127.0.0.1", NODE_ENV: "production" }, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${APP}/offline`)).ok) break; } catch { /* demarrage */ }
    await pause(250);
  }
  return { api, app, stop: async () => { app.kill(); await api.stop(); } };
}

// Positionne la session du role avant le chargement de la page.
export function sessionScript(token) {
  return `(() => { try {
    localStorage.setItem('incusight:pwa-install-dismissed-at', String(Date.now()));
    localStorage.setItem('dashboard-dark-mode', 'false');
    ${token ? `localStorage.setItem('token', '${token}'); localStorage.setItem('refreshToken', 'ref');` : "localStorage.removeItem('token'); localStorage.removeItem('refreshToken');"}
  } catch {} })();`;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const output = await mkdtemp(join(tmpdir(), "incusight-responsive-"));
  await mkdir(join(output, "shots"));
  const stack = await startStack();
  const chrome = await launchChrome({ port: 9233, profileDir: join(output, "profile") });
  const report = [];
  try {
    const page = await chrome.openPage();
    let scriptId = null;
    for (const route of routes.filter((r) => !filter || r.name.includes(filter))) {
      if (scriptId) await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptId });
      ({ identifier: scriptId } = await page.send("Page.addScriptToEvaluateOnNewDocument", { source: sessionScript(sessions[route.session]) }));
      for (const [width, height] of [...mobileViewports, ...otherViewports]) {
        await page.setViewport(width, height);
        const before = stack.api.log.length;
        const exceptionsBefore = page.exceptions.length;
        await page.navigate(`${APP}${route.path}`);
        const ready = await page.waitFor(route.ready, 8000);
        await page.settle(400, 4000);
        const metrics = await page.evaluate(MEASURE);
        const missing = stack.api.log.slice(before).filter((call) => call.status === 404 && !call.path.includes("logo")).map((call) => call.path);
        const entry = { name: route.name, session: route.session, width, height, ready, path: await page.evaluate("location.pathname + location.search"), missing: [...new Set(missing)], exceptions: page.exceptions.slice(exceptionsBefore).map((e) => String(e).split("\n")[0]), ...metrics };
        report.push(entry);
        if (shots && screenshotWidths.has(width)) await page.screenshot(join(output, "shots", `${route.name}__${width}.png`), { fullPage: true, maxHeight: width >= 768 ? 2400 : 4200 });
        const flags = [entry.docOverflow > 0 && `overflow ${entry.docOverflow}px`, entry.offenderCount && `${entry.offenderCount} hors ecran`, entry.clippedCount && `${entry.clippedCount} rognes`, entry.textSpillCount && `${entry.textSpillCount} textes debordants`, entry.tinyTargets && `${entry.tinyTargets} cibles<24`, !ready && "NON PRET", entry.errorBoundary && "ERREUR", entry.missing.length && `mock:${entry.missing.join(",")}`, entry.exceptions.length && "EXCEPTION"].filter(Boolean);
        console.log(`${route.name.padEnd(30)} ${String(width).padStart(4)}  ${flags.join(" | ") || "ok"}`);
      }
    }
  } finally {
    await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
    await chrome.close();
    await stack.stop();
    console.log(`Rapport : ${join(output, "report.json")}`);
  }
}
