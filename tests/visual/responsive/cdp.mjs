// Pilotage minimal de Chrome headless par le protocole DevTools (sans dependance).
import { spawn } from "node:child_process";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export async function launchChrome({ port, profileDir }) {
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let version;
  for (let i = 0; i < 60 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await pause(250); }
  }
  if (!version) throw new Error("Chrome debugging endpoint unavailable");
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method) for (const listener of listeners) listener(message);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${message.error.message} ${message.error.data ?? ""}`)); else request.resolve(message.result);
    }
  };
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });

  async function openPage() {
    const target = await command("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await command("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const send = (method, params) => command(method, params, sessionId);
    const exceptions = [];
    let inflight = new Set();
    let lastActivity = Date.now();
    listeners.add((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text);
      if (message.method === "Network.requestWillBeSent") { inflight.add(message.params.requestId); lastActivity = Date.now(); }
      if (message.method === "Network.loadingFinished" || message.method === "Network.loadingFailed") { inflight.delete(message.params.requestId); lastActivity = Date.now(); }
    });
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
    await send("Network.setBlockedURLs", { urls: ["*socket.io*"] });

    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (expression, timeout = 10000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        try { if (await evaluate(`Boolean(${expression})`)) return true; } catch { /* navigation */ }
        await pause(120);
      }
      return false;
    };
    const settle = async (quietMs = 500, timeout = 9000) => {
      const end = Date.now() + timeout;
      await waitFor("document.readyState === 'complete'", timeout);
      while (Date.now() < end) {
        // Le polling de notifications (30 s) n'empeche pas l'inactivite reseau.
        if (inflight.size === 0 && Date.now() - lastActivity > quietMs) break;
        await pause(100);
      }
      await pause(150);
    };
    const setViewport = (width, height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height });
    const navigate = async (url) => { inflight = new Set(); await send("Page.navigate", { url }); await pause(250); await settle(); };
    const screenshot = async (file, { fullPage = false, maxHeight = 3200 } = {}) => {
      let clip;
      if (fullPage) {
        const size = await evaluate("({ w: innerWidth, h: Math.min(document.documentElement.scrollHeight, " + maxHeight + ") })");
        clip = { x: 0, y: 0, width: size.w, height: size.h, scale: 1 };
      }
      const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
      await writeFile(file, Buffer.from(data, "base64"));
    };
    const tap = async (selectorExpression) => {
      // <html> porte scroll-behavior: smooth : on defile instantanement, sinon
      // la position calculee precede la fin de l'animation.
      const found = await evaluate(`(() => { const el = ${selectorExpression}; if (!el) return false; el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); return true; })()`);
      if (!found) return false;
      await pause(120);
      const point = await evaluate(`(() => { const el = ${selectorExpression}; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
      return true;
    };
    return { send, evaluate, waitFor, settle, navigate, setViewport, screenshot, tap, exceptions };
  }

  return {
    openPage,
    close: async () => { try { await command("Browser.close"); } catch { /* deja ferme */ } socket.close(); chrome.kill(); },
  };
}

export const outputPath = (dir, name) => join(dir, name.replace(/[^a-z0-9._-]+/gi, "_"));
