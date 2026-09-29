/**
 * Recette PWA dans Chrome, sur le build de production `standalone` (celui du
 * Dockerfile), jamais sur `next dev`. Une API factice ecoute sur l'URL de
 * NEXT_PUBLIC_API_URL, qui doit donc etre locale : aucun backend reel n'est
 * contacte.
 *
 * Prerequis : `npm run build`, Chrome installe, ports 3100 et celui de l'API libres.
 * Usage : node tests/visual/pwa.mjs [--redeploy]
 *   --redeploy relance `npm run build` en cours de recette pour verifier la
 *   mise a jour vers une nouvelle version deployee (environ une minute).
 * Resultats et captures dans le dossier temporaire affiche en fin d'execution.
 */
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const APP_PORT = 3100;
const APP = `http://127.0.0.1:${APP_PORT}`;
const REDEPLOY = process.argv.includes("--redeploy");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const env = await readFile(join(ROOT, ".env"), "utf8").catch(() => "");
const apiUrl = new URL(/^NEXT_PUBLIC_API_URL=(.*)$/m.exec(env)?.[1]?.trim() ?? "http://127.0.0.1:8050");
assert.ok(["127.0.0.1", "localhost"].includes(apiUrl.hostname), "NEXT_PUBLIC_API_URL doit etre local pour cette recette");
const API_PORT = Number(apiUrl.port || 80);

const output = await mkdtemp(join(tmpdir(), "incusight-pwa-"));
const results = [];

// --- API factice --------------------------------------------------------------
const USER = { id: "u-admin", email: "admin@incusight.test", firstName: "Awa", lastName: "Admin", role: "ADMIN", isActive: true, isEmailVerified: true };
const apiLog = [];
let apiServer = null;

function startApi() {
  apiServer = http.createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname.replace(/^\/+/, "");
    const auth = req.headers.authorization ?? "";
    res.setHeader("Access-Control-Allow-Origin", APP);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");
    res.setHeader("Cache-Control", "no-store");
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
      apiLog.push({ method: req.method, path, auth });
      const json = (status, data, headers = {}) => { res.writeHead(status, { "Content-Type": "application/json", ...headers }).end(JSON.stringify(data)); };
      if (path === "auth/refresh-token") {
        const { refreshToken } = JSON.parse(body || "{}");
        return refreshToken === "ref-valid" ? json(201, { token: "tok-valid", refreshToken: "ref-valid" }) : json(401, { message: "Refresh token invalide" });
      }
      if (path === "auth/logout") return json(201, {});
      if (auth !== "Bearer tok-valid") return json(401, { message: "Unauthorized" });
      if (path === "users/me") return json(200, USER);
      if (req.method === "GET") return json(200, [], { "X-Total-Count": "0" });
      return json(200, {});
    });
  });
  return new Promise((resolve) => apiServer.listen(API_PORT, "127.0.0.1", resolve));
}

function stopApi() {
  return new Promise((resolve) => { apiServer.closeAllConnections(); apiServer.close(() => resolve()); });
}

// --- Serveur de production standalone -----------------------------------------
let appProcess = null;

async function prepareStandalone() {
  await cp(join(ROOT, ".next/static"), join(ROOT, ".next/standalone/.next/static"), { recursive: true, force: true });
  await cp(join(ROOT, "public"), join(ROOT, ".next/standalone/public"), { recursive: true, force: true });
}

async function startApp() {
  appProcess = spawn(process.execPath, [join(ROOT, ".next/standalone/server.js")], {
    env: { ...process.env, PORT: String(APP_PORT), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: "ignore",
    windowsHide: true,
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${APP}/offline`)).ok) return; } catch { /* demarrage */ }
    await pause(250);
  }
  throw new Error("Le serveur standalone ne repond pas");
}

async function stopApp() {
  if (!appProcess) return;
  const exited = new Promise((resolve) => appProcess.once("exit", resolve));
  appProcess.kill();
  await exited;
  appProcess = null;
}

// --- Chrome (CDP) -------------------------------------------------------------
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=9231", `--user-data-dir=${join(output, "profile")}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
let socket;
let sequence = 0;
const pending = new Map();
const exceptions = [];

function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function openPage({ mobile = false } = {}) {
  const target = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const send = (method, params) => command(method, params, sessionId);
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["*socket.io*"] });
  if (mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", platform: "iPhone" });
  } else {
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* navigation en cours */ }
      await pause(150);
    }
    throw new Error(`Delai depasse : ${expression} (url ${await evaluate("location.href").catch(() => "?")})`);
  };
  const navigate = async (url) => {
    const result = await send("Page.navigate", { url });
    await pause(300);
    await waitFor("document.readyState === 'complete'");
    return result;
  };
  const screenshot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, `${name}.png`), Buffer.from(data, "base64"));
  };
  return { send, evaluate, waitFor, navigate, screenshot, sessionId };
}

const SW_STATE = `navigator.serviceWorker.getRegistration().then(r => r ? ({ active: r.active?.state ?? null, waiting: Boolean(r.waiting), installing: Boolean(r.installing), scope: r.scope, script: r.active?.scriptURL ?? null, controlled: Boolean(navigator.serviceWorker.controller) }) : null)`;
const CACHE_CONTENT = `(async () => { const out = {}; for (const name of await caches.keys()) { const cache = await caches.open(name); out[name] = (await cache.keys()).map((r) => r.url); } return out; })()`;
const ALLOWED_CACHED = new RegExp(`^${APP.replace(/[.]/g, "\\.")}/(_next/static/|icons/|favicon\\.ico|offline\\?__WB_REVISION__=)`);
const DASHBOARD_READY = "document.querySelector('.app-sidebar') && document.querySelector('[aria-label=\"Ouvrir mon compte\"]')";
const OFFLINE_READY = "document.body.innerText.includes('IncuSight est temporairement hors ligne')";

function assertCacheIsSafe(content) {
  const urls = Object.values(content).flat();
  assert.ok(urls.length > 0, "cache vide");
  const unexpected = urls.filter((url) => !ALLOWED_CACHED.test(url));
  assert.deepEqual(unexpected, [], "URL non autorisee dans CacheStorage");
  assert.equal(urls.some((url) => url.includes(`:${API_PORT}`)), false, "reponse d'API en cache");
  return { caches: Object.keys(content), entries: urls.length };
}

async function step(name, run) {
  try {
    const detail = await run();
    results.push({ name, ok: true, detail: detail ?? null });
    console.log(`OK   ${name}${detail ? ` -> ${JSON.stringify(detail)}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false, detail: String(error?.stack ?? error) });
    console.log(`FAIL ${name}\n     ${error?.message ?? error}`);
  }
}

try {
  await prepareStandalone();
  await startApi();
  await startApp();

  let version;
  for (let i = 0; i < 40; i++) {
    try { version = await (await fetch("http://127.0.0.1:9231/json/version")).json(); break; } catch { await pause(250); }
  }
  assert.ok(version, "Chrome debugging endpoint available");
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    }
  };

  const page = await openPage();
  const { evaluate, waitFor, navigate, send, screenshot } = page;

  await step("1. Application normale : landing chargee, service worker actif et controleur", async () => {
    await navigate(`${APP}/`);
    await waitFor("document.querySelector('header') && document.body.innerText.includes('IncuSight')");
    await waitFor("navigator.serviceWorker.controller", 30000);
    await waitFor(`${SW_STATE}.then(s => s && s.active === 'activated')`);
    const state = await evaluate(SW_STATE);
    assert.equal(state.scope, `${APP}/`);
    assert.equal(state.script, `${APP}/serwist/sw.js`);
    return state;
  });

  await step("2. Installation desktop : manifest valide, aucune erreur d'installabilite", async () => {
    const manifest = await send("Page.getAppManifest", {});
    assert.deepEqual(manifest.errors, []);
    const parsed = JSON.parse(manifest.data);
    assert.equal(parsed.name, "IncuSight");
    assert.equal(parsed.display, "standalone");
    const { installabilityErrors } = await send("Page.getInstallabilityErrors", {});
    assert.deepEqual(installabilityErrors, []);
    const icons = await Promise.all(parsed.icons.map(async (icon) => (await fetch(new URL(icon.src, APP))).status));
    assert.deepEqual(icons, [200, 200, 200]);
    const head = await evaluate(`({ theme: document.querySelector('meta[name=theme-color]')?.content, apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'), capable: document.querySelector('meta[name=mobile-web-app-capable], meta[name=apple-mobile-web-app-capable]')?.content, title: document.querySelector('meta[name=apple-mobile-web-app-title]')?.content })`);
    assert.equal(head.theme, "#f97316");
    return { manifestUrl: manifest.url, head };
  });

  await step("15. Cache : uniquement assets du build, icones et page hors ligne", async () => {
    await waitFor(`${CACHE_CONTENT}.then(c => Object.values(c).flat().some(u => u.includes('/offline')))`, 30000);
    return assertCacheIsSafe(await evaluate(CACHE_CONTENT));
  });

  await step("9. Login : session etablie, API appelee en direct avec le bearer", async () => {
    await evaluate("localStorage.setItem('token', 'tok-valid'); localStorage.setItem('refreshToken', 'ref-valid'); true");
    const before = apiLog.length;
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor(DASHBOARD_READY);
    const calls = apiLog.slice(before);
    assert.ok(calls.some((call) => call.path === "users/me" && call.auth === "Bearer tok-valid"));
    return { apiCalls: calls.length };
  });

  await step("6. Refresh : la page protegee est redemandee au reseau, profil recharge", async () => {
    const before = apiLog.length;
    const origin = await evaluate("performance.timeOrigin");
    await send("Page.reload", { ignoreCache: false });
    await waitFor(`performance.timeOrigin !== ${origin}`);
    await waitFor(DASHBOARD_READY);
    assert.ok(apiLog.slice(before).some((call) => call.path === "users/me"));
    const content = await evaluate(CACHE_CONTENT);
    assertCacheIsSafe(content);
    assert.equal(Object.values(content).flat().some((url) => url.includes("/dashboard")), false, "page protegee en cache");
    return "aucune page /dashboard ni reponse d'API dans CacheStorage";
  });

  await step("7. Navigation client dans le dashboard", async () => {
    await evaluate("document.querySelector('a[href=\"/dashboard/admin/users\"]').click(); true");
    await waitFor("location.pathname === '/dashboard/admin/users'");
    await waitFor(DASHBOARD_READY);
    return await evaluate("location.pathname");
  });

  await step("8. Logout : tokens supprimes, page protegee non resservie", async () => {
    await evaluate("document.querySelector('[aria-label=\"Ouvrir mon compte\"]').click(); true");
    await waitFor("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Se déconnecter'))");
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Se déconnecter')).click(); true");
    await waitFor("!localStorage.getItem('token') && !location.pathname.startsWith('/dashboard')");
    assert.ok(apiLog.some((call) => call.path === "auth/logout"));
    await navigate(`${APP}/dashboard/admin/notifications`);
    await pause(1500);
    const after = await evaluate(`({ path: location.pathname, dashboard: Boolean(${DASHBOARD_READY}), token: localStorage.getItem('token') })`);
    assert.equal(after.dashboard, false, "le dashboard reste affiche apres logout");
    assert.equal(after.token, null);
    return after;
  });

  await step("10. Token expire : refresh transparent, puis expiration sans boucle de redirection", async () => {
    await evaluate("localStorage.setItem('token', 'tok-expired'); localStorage.setItem('refreshToken', 'ref-valid'); true");
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor(DASHBOARD_READY);
    assert.equal(await evaluate("localStorage.getItem('token')"), "tok-valid");
    await evaluate("localStorage.setItem('token', 'tok-expired'); localStorage.setItem('refreshToken', 'ref-expired'); true");
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor("location.search.includes('sessionExpired=1')");
    const first = await evaluate("location.href");
    await pause(3000);
    const second = await evaluate("location.href");
    assert.equal(second, first, "la redirection boucle");
    assert.equal(await evaluate("localStorage.getItem('token')"), null);
    return { refreshed: "tok-valid", expiredRedirect: new URL(second).pathname + new URL(second).search };
  });

  await step("11. API indisponible : frontend servi, session conservee, pas de page hors ligne", async () => {
    await evaluate("localStorage.setItem('token', 'tok-valid'); localStorage.setItem('refreshToken', 'ref-valid'); true");
    await stopApi();
    await navigate(`${APP}/dashboard/admin/notifications`);
    await pause(2500);
    const state = await evaluate(`({ offline: ${OFFLINE_READY}, token: localStorage.getItem('token'), path: location.pathname })`);
    await screenshot("11-api-indisponible");
    await startApi();
    assert.equal(state.offline, false);
    assert.equal(state.token, "tok-valid");
    return state;
  });

  await step("12. Offline (navigation directe) : page hors ligne a l'URL demandee", async () => {
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor(DASHBOARD_READY);
    await stopApp();
    await navigate(`${APP}/dashboard/admin/applications`);
    await waitFor(OFFLINE_READY);
    const state = await evaluate("({ path: location.pathname, retry: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Réessayer')), fakeData: Boolean(document.querySelector('.app-sidebar')) })");
    assert.equal(state.path, "/dashboard/admin/applications");
    assert.equal(state.retry, true);
    assert.equal(state.fakeData, false);
    await screenshot("12-offline-desktop");
    return state;
  });

  await step("12b. Offline (rechargement) : page hors ligne", async () => {
    await send("Page.reload", {});
    await pause(500);
    await waitFor(OFFLINE_READY);
    return await evaluate("location.pathname");
  });

  await step("13. Retour online : « Réessayer » recharge la page demandee", async () => {
    await startApp();
    await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Réessayer')).click(); true");
    await waitFor(DASHBOARD_READY);
    return await evaluate("location.pathname");
  });

  await step("12c. Offline (navigation client) : aucune fausse donnee affichee", async () => {
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor(DASHBOARD_READY);
    await stopApp();
    await evaluate("document.querySelector('a[href=\"/dashboard/admin/program\"]').click(); true");
    await pause(3000);
    const state = await evaluate(`({ path: location.pathname, offlinePage: ${OFFLINE_READY} })`);
    await screenshot("12c-offline-navigation-client");
    await startApp();
    return state;
  });

  let buildId = (await readFile(join(ROOT, ".next/BUILD_ID"), "utf8")).trim();

  if (REDEPLOY) {
    await step("17. Nouvelle version deployee : build, detection, bandeau, activation", async () => {
      await navigate(`${APP}/dashboard/admin/notifications`);
      await waitFor(DASHBOARD_READY);
      const offlineBefore = Object.values(await evaluate(CACHE_CONTENT)).flat().find((url) => url.includes("/offline"));
      await stopApp();
      const build = spawnSync("npm", ["run", "build"], { cwd: ROOT, shell: true, encoding: "utf8" });
      assert.equal(build.status, 0, build.stdout + build.stderr);
      await prepareStandalone();
      await startApp();
      const newBuildId = (await readFile(join(ROOT, ".next/BUILD_ID"), "utf8")).trim();
      assert.notEqual(newBuildId, buildId);

      // Sans activer le nouveau service worker, un rechargement sert deja la nouvelle version.
      await send("Page.reload", {});
      await pause(500);
      await waitFor(DASHBOARD_READY);
      const html = await (await fetch(`${APP}/dashboard/admin/notifications`)).text();
      assert.ok(html.includes(newBuildId), "le HTML servi n'est pas celui du nouveau build");
      assert.ok(await evaluate(`document.documentElement.innerHTML.includes(${JSON.stringify(newBuildId)})`), "la page reste sur l'ancien build");

      await evaluate("navigator.serviceWorker.getRegistration().then(r => r.update()).then(() => true)");
      await waitFor("document.body.innerText.includes('Nouvelle version disponible')", 30000);
      await screenshot("17-bandeau-mise-a-jour");
      const waiting = await evaluate(SW_STATE);
      assert.equal(waiting.waiting, true);
      const origin = await evaluate("performance.timeOrigin");
      await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Mettre à jour')).click(); true");
      await waitFor(`performance.timeOrigin !== ${origin}`, 20000);
      await waitFor(DASHBOARD_READY);
      await waitFor(`${SW_STATE}.then(s => s && !s.waiting && s.active === 'activated')`);
      const content = await evaluate(CACHE_CONTENT);
      assertCacheIsSafe(content);
      const offlineEntries = Object.values(content).flat().filter((url) => url.includes("/offline"));
      assert.equal(offlineEntries.length, 1, "ancienne revision de la page hors ligne conservee");
      assert.notEqual(offlineEntries[0], offlineBefore);
      buildId = newBuildId;
      return { buildId: newBuildId, offlineRevision: offlineEntries[0].split("=")[1] };
    });
  }

  await step("16. Suppression du cache : application servie par le reseau, precache reconstruit", async () => {
    await evaluate("caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => true)");
    await navigate(`${APP}/dashboard/admin/notifications`);
    await waitFor(DASHBOARD_READY);
    await send("Storage.clearDataForOrigin", { origin: APP, storageTypes: "service_workers,cache_storage" });
    await evaluate("localStorage.clear(); true");
    await navigate(`${APP}/`);
    await waitFor("navigator.serviceWorker.controller", 30000);
    await waitFor(`${CACHE_CONTENT}.then(c => Object.values(c).flat().some(u => u.includes('/offline')))`, 30000);
    return assertCacheIsSafe(await evaluate(CACHE_CONTENT));
  });

  // La landing redirige une session active vers le dashboard.
  await evaluate("localStorage.clear(); true");

  await step("4. iOS : indication « Sur l'ecran d'accueil » sans beforeinstallprompt", async () => {
    const ios = await openPage({ mobile: true });
    await ios.navigate(`${APP}/`);
    await ios.waitFor("document.querySelector('.pwa-prompt') && document.body.innerText.includes('écran d')");
    const overflow = await ios.evaluate("document.documentElement.scrollWidth - innerWidth");
    await ios.screenshot("04-ios-landing");
    assert.ok(overflow <= 0, `debordement horizontal ${overflow}px`);
    await ios.evaluate("document.querySelector('.pwa-prompt-close').click(); true");
    await ios.navigate(`${APP}/`);
    await pause(1000);
    const hidden = !(await ios.evaluate("Boolean(document.querySelector('.pwa-prompt'))"));
    assert.equal(hidden, true, "la proposition revient apres fermeture");
    await ios.evaluate("localStorage.clear(); true");

    await ios.evaluate("localStorage.setItem('token', 'tok-valid'); localStorage.setItem('refreshToken', 'ref-valid'); true");
    await ios.navigate(`${APP}/dashboard/admin/notifications`);
    await ios.waitFor(DASHBOARD_READY);
    const dashboardOverflow = await ios.evaluate("document.documentElement.scrollWidth - innerWidth");
    await ios.screenshot("04-ios-dashboard");
    await stopApp();
    await ios.navigate(`${APP}/dashboard/startup`);
    await ios.waitFor(OFFLINE_READY);
    await ios.screenshot("12-offline-mobile");
    const offlineOverflow = await ios.evaluate("document.documentElement.scrollWidth - innerWidth");
    await startApp();
    assert.ok(dashboardOverflow <= 0 && offlineOverflow <= 0);
    await ios.evaluate("localStorage.clear(); true");
    return { dismissedHidden: hidden, overflow, dashboardOverflow, offlineOverflow };
  });

  await step("5. Standalone : aucune proposition une fois l'application installee (iOS)", async () => {
    // Chrome n'emule pas `display-mode` ; sur iOS, l'app installee expose
    // `navigator.standalone === true`, que l'on simule ici.
    const ios = await openPage({ mobile: true });
    await ios.send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(navigator, 'standalone', { get: () => true });" });
    await ios.navigate(`${APP}/`);
    await ios.waitFor("document.querySelector('header')");
    await pause(1500);
    const prompt = await ios.evaluate("Boolean(document.querySelector('.pwa-prompt'))");
    assert.equal(await ios.evaluate("navigator.standalone"), true);
    assert.equal(prompt, false);
    return { standalone: true, prompt };
  });

  await step("3. Android/Chrome : beforeinstallprompt capte, bouton « Installer »", async () => {
    // Chrome headless n'emet pas toujours l'evenement : on le simule pour
    // verifier le rendu, l'installabilite reelle est verifiee a l'etape 2.
    await evaluate("localStorage.clear(); true");
    await navigate(`${APP}/`);
    await pause(800);
    await evaluate("(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); return e.defaultPrevented; })()");
    await waitFor("[...document.querySelectorAll('.pwa-prompt button')].some(b => b.textContent.trim() === 'Installer')");
    await screenshot("03-installer-desktop");
    await evaluate("window.dispatchEvent(new Event('appinstalled')); true");
    await waitFor("!document.querySelector('.pwa-prompt')");
    return "bouton affiche, masque apres appinstalled";
  });

  assert.deepEqual(exceptions.filter(Boolean), [], "exceptions JavaScript dans la page");
} catch (error) {
  results.push({ name: "execution", ok: false, detail: String(error?.stack ?? error) });
  console.error(error);
} finally {
  await writeFile(join(output, "results.json"), JSON.stringify({ results, exceptions, apiCalls: apiLog.length }, null, 2));
  socket?.close();
  chrome.kill();
  await stopApp().catch(() => undefined);
  if (apiServer?.listening) await stopApi();
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} etapes reussies. Captures : ${output}`);
  process.exitCode = failed.length ? 1 : 0;
}
