import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { installDom } from "./dom-harness.mjs";

const dom = installDom();
let desktop = true;
const mediaListeners = new Set();
window.matchMedia = () => ({ matches: desktop, addEventListener: (_, cb) => mediaListeners.add(cb), removeEventListener: (_, cb) => mediaListeners.delete(cb) });
const navigation = await import("./next-navigation-stub.mjs");
mock.module("next/navigation", { namedExports: { ...navigation } });
const { createElement: h, useState, useCallback } = await import("react");
mock.module("next/link", { defaultExport: ({ children, onClick, ...props }) => h("a", { ...props, onClick: event => { event.preventDefault(); onClick?.(event); window.history.pushState({}, "", props.href); } }, children) });
mock.module("../../src/contexts/NotificationContext.tsx", { namedExports: { useNotifications: () => ({ unreadCount: 33 }) } });
mock.module("../../src/contexts/StartupContext.tsx", { namedExports: { useStartups: () => ({ startups: [{}, {}] }) } });
mock.module("../../src/contexts/ProgramContext.tsx", { namedExports: { usePrograms: () => ({ programs: [{}] }) } });
mock.module("../../src/contexts/ApplicationContext.tsx", { namedExports: { useApplications: () => ({ applications: [], applicationsTotal: 15 }) } });
const { render, screen, fireEvent, cleanup, act, within } = await import("@testing-library/react");
const { default: Sidebar } = await import("../../src/components/dashboard/Sidebar.tsx");
const { useSidebarPreference, SIDEBAR_PREFERENCE_KEY } = await import("../../src/hooks/useSidebarPreference.ts");
let logout;
function Harness({ role = "ADMIN" }) {
  const { collapsed, toggle } = useSidebarPreference();
  const [isOpen, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return h("div", { "data-testid": "shell", "data-sidebar-collapsed": collapsed },
    h("button", { onClick: () => setOpen(true) }, "Ouvrir"),
    h(Sidebar, { role, user: { firstName: "Samira", lastName: "Martin", role }, collapsed, onToggleCollapsed: toggle, isOpen, onClose: close, onLogout: logout }));
}
const collapse = () => fireEvent.click(screen.getByRole("button", { name: "Replier le menu" }));
beforeEach(() => {
  desktop = true; logout = mock.fn(); localStorage.clear();
  window.history.replaceState({}, "", "/dashboard/admin/incubation-followups?followUp=f1&tab=notes&custom=keep");
});
afterEach(cleanup);
after(() => dom.cleanup());

test("sidebar : ouverte par défaut, une seule navigation", () => {
  render(h(Harness));
  assert.equal(screen.getByTestId("shell").dataset.sidebarCollapsed, "false");
  assert.equal(screen.getAllByRole("navigation").length, 1);
  assert.equal(screen.getByRole("button", { name: "Replier le menu" }).getAttribute("aria-expanded"), "true");
});
test("sidebar : repli et dépli sans perdre les paramètres URL", () => {
  render(h(Harness)); const url = location.href; collapse();
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "true");
  assert.equal(screen.getByRole("button", { name: "Déplier le menu" }).getAttribute("aria-expanded"), "false");
  fireEvent.click(screen.getByRole("button", { name: "Déplier le menu" }));
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "false");
  assert.equal(location.href, url);
});
test("sidebar : la préférence persiste au remontage", () => {
  const view = render(h(Harness)); collapse();
  assert.equal(localStorage.getItem(SIDEBAR_PREFERENCE_KEY), "true");
  view.unmount(); render(h(Harness));
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "true");
});
test("sidebar : hydratation sans divergence avec une préférence repliée", async () => {
  const { renderToString } = await import("react-dom/server");
  const { hydrateRoot } = await import("react-dom/client");
  localStorage.setItem(SIDEBAR_PREFERENCE_KEY, "true");
  const container = document.createElement("div");
  container.innerHTML = renderToString(h(Harness));
  assert.equal(container.querySelector(".app-sidebar").dataset.rail, "false");
  document.body.append(container);
  const errors = []; let root;
  try {
    await act(async () => { root = hydrateRoot(container, h(Harness), { onRecoverableError: error => errors.push(error) }); });
    assert.equal(container.querySelector(".app-sidebar").dataset.rail, "true");
    assert.deepEqual(errors, []);
  } finally { await act(async () => root?.unmount()); container.remove(); }
});
test("sidebar : une préférence ouverte reste ouverte", () => {
  localStorage.setItem(SIDEBAR_PREFERENCE_KEY, "false"); render(h(Harness));
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "false");
});
test("sidebar : un stockage refusé ne bloque pas le repli", () => {
  const get = mock.method(window.Storage.prototype, "getItem", () => { throw new Error("Storage denied"); });
  const set = mock.method(window.Storage.prototype, "setItem", () => { throw new Error("Storage denied"); });
  try { render(h(Harness)); collapse(); assert.equal(document.querySelector(".app-sidebar").dataset.rail, "true"); }
  finally { get.mock.restore(); set.mock.restore(); }
});
test("sidebar : icônes, route active et notifications restent dans le rail", () => {
  render(h(Harness)); collapse();
  const active = screen.getByRole("link", { name: "Suivi incubation" });
  assert.equal(active.getAttribute("aria-current"), "page"); assert.ok(active.querySelector("svg"));
  assert.ok(within(screen.getByRole("link", { name: "Notifications" })).getByText("33"));
  assert.ok(within(screen.getByRole("link", { name: "Applications" })).getByText("15"));
});
test("sidebar : infobulle au survol puis disparition", () => {
  render(h(Harness)); collapse();
  const link = screen.getByRole("link", { name: "Startups" });
  fireEvent.mouseEnter(link); assert.equal(screen.getByRole("tooltip").textContent, "Startups");
  assert.equal(link.getAttribute("aria-describedby"), screen.getByRole("tooltip").id);
  fireEvent.mouseLeave(link); assert.equal(screen.queryByRole("tooltip"), null);
});
test("sidebar : infobulle au clavier et fermeture par Échap", () => {
  render(h(Harness)); collapse(); const link = screen.getByRole("link", { name: "Programs" });
  fireEvent.focus(link); assert.ok(screen.getByRole("tooltip"));
  fireEvent.keyDown(link, { key: "Escape" }); assert.equal(screen.queryByRole("tooltip"), null);
});
test("sidebar : recherche déplie le rail et place le focus", () => {
  render(h(Harness)); collapse(); fireEvent.click(screen.getByRole("button", { name: "Rechercher dans le menu" }));
  assert.equal(document.activeElement, screen.getByRole("textbox", { name: "Rechercher dans le menu" }));
});
test("sidebar : recherche des rubriques et état vide", () => {
  render(h(Harness)); const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "incubation" } }); assert.equal(screen.getAllByRole("link").length, 1);
  fireEvent.change(input, { target: { value: "inexistant" } }); assert.ok(screen.getByText("Aucune rubrique trouvée."));
});
test("sidebar : compte et déconnexion accessibles depuis le rail", () => {
  render(h(Harness)); collapse(); fireEvent.click(screen.getByRole("button", { name: "Ouvrir mon compte" }));
  const popover = document.querySelector(".app-account-popover");
  assert.equal(within(popover).getByRole("link").getAttribute("href"), "/dashboard/admin/profile");
  fireEvent.click(within(popover).getByRole("button", { name: "Se déconnecter" }));
  assert.equal(logout.mock.callCount(), 1);
});
test("sidebar : Échap ferme le compte et rend le focus à l’avatar", () => {
  render(h(Harness)); const button = screen.getByRole("button", { name: "Ouvrir mon compte" });
  fireEvent.click(button); fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(document.querySelector(".app-account-popover"), null); assert.equal(document.activeElement, button);
});
test("sidebar mobile : tiroir fermé inerte, ouverture et fermeture par lien", () => {
  desktop = false; localStorage.setItem(SIDEBAR_PREFERENCE_KEY, "true"); render(h(Harness));
  const sidebar = document.querySelector(".app-sidebar"); assert.equal(sidebar.hasAttribute("inert"), true);
  fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
  assert.equal(sidebar.hasAttribute("inert"), false); assert.equal(sidebar.dataset.rail, "false");
  assert.equal(sidebar.getAttribute("aria-modal"), "true"); assert.equal(document.body.style.overflow, "hidden");
  fireEvent.click(screen.getByRole("link", { name: "Startups" }));
  assert.equal(sidebar.dataset.open, "false"); assert.equal(document.body.style.overflow, "");
});
test("sidebar mobile : Échap ferme le tiroir et restitue le focus", () => {
  desktop = false; render(h(Harness)); const open = screen.getByRole("button", { name: "Ouvrir" });
  act(() => open.focus()); fireEvent.click(open); fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(document.querySelector(".app-sidebar").dataset.open, "false"); assert.equal(document.activeElement, open);
});
test("sidebar : changement de viewport conserve la préférence desktop", () => {
  render(h(Harness)); collapse();
  act(() => { desktop = false; mediaListeners.forEach(cb => cb()); });
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "false");
  act(() => { desktop = true; mediaListeners.forEach(cb => cb()); });
  assert.equal(document.querySelector(".app-sidebar").dataset.rail, "true");
});
for (const [role, path] of [["STARTUP", "/dashboard/startup/profile"], ["EVALUATOR", "/dashboard/evaluateur/profile"]]) {
  test(`sidebar ${role} : rubriques et compte propres au rôle`, () => {
    render(h(Harness, { role })); collapse();
    assert.equal(screen.queryByRole("link", { name: "Users" }), null);
    assert.equal(screen.getByRole("link", { name: "Mon compte" }).getAttribute("href"), path);
    assert.ok(within(screen.getByRole("link", { name: "Notifications" })).getByText("33"));
  });
}
