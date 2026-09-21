/** Production-browser inspection with isolated fixtures. No real backend is contacted.
 * Start the built app on port 3106, then run: node tests/visual/incubation-workspace.mjs
 * Chrome must be installed. Captures and measured checks are written to the OS temp directory.
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { initialFollowUps, programs, applications, admin, listResponse, detailResponse } from "../dom/incubation-fixtures.mjs";

const output = await mkdtemp(join(tmpdir(), "incubation-visual-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=9227", `--user-data-dir=${join(output, "profile")}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let version;
  for (let i = 0; i < 40; i++) {
    try { version = await (await fetch("http://127.0.0.1:9227/json/version")).json(); break; } catch { await pause(250); }
  }
  assert.ok(version, "Chrome debugging endpoint available");
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const exceptions = [];
  const events = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (["Runtime.consoleAPICalled", "Network.loadingFailed", "Network.requestWillBeSent"].includes(message.method)) events.push({method:message.method, params:message.params});
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails);
    const request = pending.get(message.id);
    if (request) {
      pending.delete(message.id);
      if (message.error) request.reject(message.error);
      else request.resolve(message.result);
    }
  };
  function command(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const target = await command("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await command("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const send = (method, params) => command(method, params, sessionId);
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Network.setBlockedURLs", { urls: ["*socket.io*"] });
  const seed = { followUps: initialFollowUps, programs, applications, admin, list: listResponse(initialFollowUps), detail: detailResponse(initialFollowUps[0], true) };
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    localStorage.setItem('token', 'visual-fixture-admin');
    const fixture = ${JSON.stringify(seed)};
    const originalFetch = window.fetch.bind(window);
    window.__fixtureRequests = [];
    window.fetch = async (input, options = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.origin === location.origin) return originalFetch(input, options);
      window.__fixtureRequests.push(url.pathname);
      const path = url.pathname.replace(/^\\//, '');
      let data = [];
      if (path === 'users/me') data = fixture.admin;
      else if (path === 'incubation-followups') data = fixture.followUps;
      else if (path === 'admin/startup-vigilance') data = fixture.list;
      else if (path.startsWith('admin/startup-vigilance/')) data = fixture.detail;
      else if (path === 'program') data = fixture.programs;
      else if (path === 'application') data = fixture.applications;
      else if (path.includes('unread-count')) data = { count: 33 };
      else if (path.includes('stats') || path.includes('badges')) data = {};
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  ` });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  async function waitFor(expression) {
    for (let i = 0; i < 80; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    await writeFile(join(output, "failure.json"), JSON.stringify({events,exceptions,location: await evaluate("location.href"),requests:await evaluate("window.__fixtureRequests"),tabs:await evaluate(`Array.from(document.querySelectorAll('[role=tab]')).map(el=>({text:el.textContent,disabled:el.disabled,props:Object.keys(el).filter(k=>k.includes('react')),handler:String(el[Object.keys(el).find(k=>k.startsWith('__reactProps'))]?.onClick)}))`)}, null, 2));
    await capture("failure");
    throw new Error(`Timeout ${expression}. Diagnostics: ${output}`);
  }
  async function capture(name) {
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(join(output, `${name}.png`), Buffer.from(data, "base64"));
  }
  async function click(selector) {
    const point = await evaluate(`(() => {const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'nearest',inline:'nearest'}); const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
  }
  const results = [];
  for (const [width, height] of [[1920,1080],[1600,900],[1440,900],[1366,768],[1024,768],[768,1024],[390,844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: "http://localhost:3106/dashboard/admin/incubation-followups?followUp=f1&tab=overview" });
    await waitFor("document.querySelector('.inc-overview') && document.querySelector('.inc-startup-item')");
    await pause(150);
    if (width >= 1280 && await evaluate("document.querySelector('.app-sidebar').dataset.rail === 'true'")) {
      await click('.app-sidebar-toggle button'); await pause(250);
    }
    for (const collapsed of width >= 1280 ? [false, true] : [false]) {
    if (collapsed) {
      const url = await evaluate('location.href');
      const requests = await evaluate("window.__fixtureRequests.filter(p=>p.includes('startup-vigilance')).length");
      await click('.app-sidebar-toggle button'); await pause(300);
      assert.equal(await evaluate('location.href'), url, 'collapse preserves URL');
      assert.equal(await evaluate("window.__fixtureRequests.filter(p=>p.includes('startup-vigilance')).length"), requests, 'collapse does not refetch vigilance');
      assert.equal(await evaluate("localStorage.getItem('incusight-sidebar-collapsed')"), 'true');
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.app-sidebar-label')).display"), 'none');
      await evaluate("document.querySelector('.app-sidebar nav a').focus()");
      await waitFor("document.querySelector('[role=tooltip]')");
      await evaluate("document.activeElement.blur()");
      await click('.app-account-button');
      await waitFor("document.querySelector('.app-account-popover')");
      await capture(`${width}x${height}-account-rail`);
      await click('.app-account-button');
      await send('Page.reload');
      await waitFor("document.querySelector('.inc-startup-item') && document.querySelector('.app-sidebar').dataset.rail === 'true'");
    }
    if (width < 1280) {
      await click('.app-hamburger'); await waitFor("document.querySelector('.app-sidebar').dataset.open === 'true'");
      await waitFor("Math.abs(document.querySelector('.app-sidebar').getBoundingClientRect().left) < 1");
      assert.equal(await evaluate("document.querySelector('.app-sidebar').getBoundingClientRect().width"), 272);
      assert.equal(await evaluate("document.activeElement.classList.contains('app-drawer-close')"), true, 'drawer receives focus');
      await capture(`${width}x${height}-drawer`);
      await click('.app-drawer-close'); await waitFor("document.querySelector('.app-sidebar').dataset.open === 'false'");
    }
    await click('button[aria-label="Notifications"]');
    await waitFor("document.querySelector('.app-notification-popover')");
    const popover = await evaluate("(() => {const r=document.querySelector('.app-notification-popover').getBoundingClientRect();return {left:r.left,right:r.right};})()");
    assert.ok(popover.left >= 0 && popover.right <= width, 'notification dropdown fits viewport');
    await click('button[aria-label="Notifications"]');
    for (const tab of ["overview", "objectives", "journal", "vigilance", "notes"]) {
      await click(`#inc-tab-${tab}`);
      await waitFor(`document.querySelector('#inc-panel-${tab}')`);
      await evaluate("window.scrollTo(0,0)");
      await pause(120);
      const measured = await evaluate(`(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
        const nav = document.querySelector('.app-sidebar nav');
        return { overflow: document.documentElement.scrollWidth > innerWidth, navOverflow: nav.scrollWidth > nav.clientWidth, sidebarVisible: getComputedStyle(document.querySelector('.inc-sidebar')).display !== 'none', globalSidebar:rect('.app-sidebar'), appHeader:rect('[data-dashboard-header]'), header:rect('.inc-startup-header'), tabs:rect('.inc-tabs'), panel:rect('[role=tabpanel]'), bodyWidth:document.documentElement.scrollWidth };
      })()`);
      results.push({ width, height, tab, collapsed, ...measured });
      assert.equal(measured.overflow, false, `horizontal overflow ${width} ${tab}`);
      assert.equal(measured.navOverflow, false, 'no horizontal scrollbar in global nav');
      assert.equal(measured.sidebarVisible, width >= 1200);
      assert.ok(measured.panel.width > (width < 600 ? 280 : 450), "usable content width");
      assert.ok(measured.appHeader.height >= 64 && measured.appHeader.height <= 72, 'compact global header');
      if (width >= 1280) assert.equal(measured.globalSidebar.width, collapsed ? 72 : 272);
      await capture(`${width}x${height}-${collapsed ? 'rail' : 'open'}-${tab}`);
      if (tab === 'vigilance' && (width === 1440 || width === 390)) {
        await evaluate("document.querySelector('.inc-ai-analysis').scrollIntoView({block:'start',behavior:'instant'})");
        await pause(100);
        await capture(`${width}x${height}-${collapsed ? 'rail' : 'open'}-ai-detail`);
      }
    }
    // Verify long content retains its contextual header while scrolling.
    await evaluate("document.querySelector('#inc-tab-journal').click()");
    await waitFor("document.querySelector('.inc-journal')");
    await evaluate("window.scrollTo({top:700, behavior:'instant'})"); await pause(100);
    const sticky = await evaluate("document.querySelector('.inc-context').getBoundingClientRect().top");
    assert.ok(sticky >= 0 && sticky < height / 2, `context remains visible at ${width}`);
    if (width === 390) {
      await evaluate("document.querySelector('.inc-back').click()");
      await waitFor("document.querySelector('.inc-workspace').dataset.selected === 'false'");
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.inc-sidebar')).display === 'none'"), false);
      await evaluate("window.scrollTo({top:0,behavior:'instant'})"); await capture("390x844-list");
      await click(".inc-startup-item");
      await waitFor("document.querySelector('.inc-workspace').dataset.selected === 'true'");
      await evaluate("window.history.back()");
      await waitFor("document.querySelector('.inc-workspace').dataset.selected === 'false'");
      await evaluate("window.history.forward()");
      await waitFor("document.querySelector('.inc-workspace').dataset.selected === 'true'");
      await click("#inc-tab-notes");
      await waitFor("document.querySelector('#inc-panel-notes')");
      await evaluate("window.history.back()");
      await waitFor("document.querySelector('#inc-panel-journal')");
    }
    }
  }
  await send("Page.navigate", { url: "http://localhost:3106/dashboard/admin/incubation-followups?followUp=f1&tab=objectives" });
  await waitFor("document.querySelector('.inc-objectives')");
  await click('button[aria-label="Activer le thème sombre"]'); await pause(100); await capture("390x844-dark-objectives");
  for (const tab of ['overview', 'journal', 'vigilance', 'notes']) {
    await click(`#inc-tab-${tab}`); await waitFor(`document.querySelector('#inc-panel-${tab}')`);
    await evaluate("window.scrollTo({top:0,behavior:'instant'})"); await pause(80);
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await capture(`390x844-dark-${tab}`);
    if (tab === 'journal') {
      await click('.inc-update-details summary');
      await capture('390x844-dark-journal-expanded');
    }
    if (tab === 'vigilance') {
      await evaluate("document.querySelector('.inc-ai-analysis').scrollIntoView({block:'start',behavior:'instant'})");
      await pause(100); await capture('390x844-dark-ai');
    }
  }
  await click('#inc-tab-objectives'); await waitFor("document.querySelector('.inc-objectives')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Ajouter un objectif')).click()");
  await waitFor("document.querySelector('[role=dialog]:not(.app-sidebar)')"); await capture("390x844-objective-dialog");
  const modal = await evaluate("(() => {const r=document.querySelector('[role=dialog]:not(.app-sidebar)').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()");
  assert.ok(modal.left >= 0 && modal.right <= 390 && modal.top >= 0 && modal.bottom <= 844);
    await writeFile(join(output, "checks.json"), JSON.stringify({ results, exceptions, modal }, null, 2));
  assert.equal(exceptions.length, 0, "no uncaught browser exceptions");
  console.log(JSON.stringify({ output, views: results.length, exceptions: exceptions.length }));
  await command("Browser.close");
} finally { socket?.close(); chrome.kill(); }
