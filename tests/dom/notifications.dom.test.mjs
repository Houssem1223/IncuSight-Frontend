import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";

/**
 * Notifications : un clic (menu du header ou page Notifications) marque lue et
 * ouvre la ressource, sans modal intermediaire. Vrais NotificationProvider,
 * Header et NotificationsPanel ; API simulee, socket neutralise.
 */

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";
const { installDom } = await import("./dom-harness.mjs");
const dom = installDom();
const navigation = await import("./next-navigation-stub.mjs");
mock.module("next/navigation", { namedExports: { ...navigation } });
mock.module("socket.io-client", { namedExports: { io: () => ({ on() {}, close() {} }) } });
let auth;
mock.module("../../src/contexts/AuthContext.tsx", { namedExports: { useAuth: () => auth } });
const { createElement: h } = await import("react");
const { render, screen, fireEvent, waitFor, cleanup, within, act } = await import("@testing-library/react");
const { NotificationProvider } = await import("../../src/contexts/NotificationContext.tsx");
const { default: Header } = await import("../../src/components/dashboard/Header.tsx");
const { default: NotificationsPanel } = await import("../../src/components/dashboard/NotificationsPanel.tsx");

const json = (data, status = 200, total) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...(total === undefined ? {} : { "X-Total-Count": String(total) }) } });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const notification = (id, type, extra = {}) => ({ id, type, title: `Titre ${id}`, message: `Message ${id}`, isRead: false, createdAt: "2026-09-18T15:31:00Z", ...extra });

let notifications, serverUnread, total, readCalls, readResponse;

beforeEach(() => {
  auth = { user: { id: "u1", role: "ADMIN", firstName: "Samira", lastName: "Martin", email: "admin@example.test" }, token: "fixture-access", isAuthReady: true, isAuthenticated: true };
  localStorage.setItem("token", auth.token);
  window.history.replaceState({}, "", "/dashboard/admin");
  notifications = [];
  serverUnread = null;
  total = undefined;
  readCalls = [];
  readResponse = null;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.slice(1);
    const method = options.method || "GET";
    if (path === "notifications" && method === "GET") return json(notifications, 200, total ?? notifications.length);
    if (path === "notifications/unread-count") return json({ count: serverUnread ?? notifications.filter((n) => !n.isRead).length });
    const read = path.match(/^notifications\/([^/]+)\/read$/);
    if (read && method === "PATCH") {
      readCalls.push(read[1]);
      if (readResponse) return readResponse(read[1]);
      const target = notifications.find((n) => n.id === read[1]);
      if (target) target.isRead = true;
      if (serverUnread !== null) serverUnread -= 1;
      return json({ count: 1 });
    }
    throw new Error(`Unexpected ${method} ${path}`);
  };
});
afterEach(() => cleanup());
after(() => dom.cleanup());

function mountHeader() {
  return render(h(NotificationProvider, {}, h(Header, { user: auth.user, darkMode: false, onToggleDarkMode() {}, onToggleSidebar() {} })));
}
const bell = () => screen.getByRole("button", { name: "Notifications" });
const popover = () => document.querySelector(".app-notification-popover");
async function openDropdown() {
  // Au montage, le header ferme le menu a la frame suivante (reinitialisation
  // par route) : on laisse passer cette frame, comme le ferait un utilisateur.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  fireEvent.click(bell());
  await waitFor(() => assert.ok(popover() && within(popover()).queryAllByRole("listitem").length > 0 || within(popover()).queryByText("Aucune notification.")));
}
// Apres une navigation, le header referme le menu a la frame suivante : on la
// laisse passer avant de le rouvrir.
async function reopenDropdown() {
  const tick = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)); });
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (!popover()) fireEvent.click(bell());
    await tick();
    if (!popover()) continue;
    await tick();
    if (popover()) return;
  }
  assert.fail("le menu des notifications ne reste pas ouvert");
}
const counter = () => within(popover()).getByText(/non lues/).textContent;
// Badge de la cloche : visible sans rouvrir le menu (rouvrir relit le serveur).
const badge = () => bell().querySelector("span")?.textContent ?? "0";
const markOnServer = (id) => { const target = notifications.find((n) => n.id === id); if (target) target.isRead = true; if (serverUnread !== null) serverUnread -= 1; };
const itemButton = (id) => within(popover()).getByText(`Titre ${id}`).closest("button");

test("notification non lue : lue immediatement, compteur -1, menu ferme, navigation, sans modal", async () => {
  notifications = [notification("n1", "APPLICATION_SUBMITTED", { applicationId: "a1", programId: "p1" }), notification("n2", "EVALUATION_SUBMITTED", { applicationId: "a2" })];
  mountHeader();
  await openDropdown();
  assert.equal(counter(), "2 non lues");

  assert.equal(badge(), "2");
  const pending = deferred();
  readResponse = async (id) => { await pending.promise; markOnServer(id); return json({ count: 1 }); };
  fireEvent.click(itemButton("n1"));

  // Avant meme la reponse du serveur : navigation, menu ferme, aucune modal,
  // compteur deja decremente.
  assert.equal(window.location.pathname + window.location.search, "/dashboard/admin/applications?application=a1");
  await waitFor(() => assert.equal(popover(), null));
  assert.equal(document.querySelector("[role=dialog]"), null);
  assert.equal(readCalls.length, 1);
  assert.equal(badge(), "1");

  await act(async () => { pending.resolve(); await pending.promise; });
  await reopenDropdown();
  await waitFor(() => assert.equal(counter(), "1 non lues"));
  assert.equal(within(itemButton("n1")).queryByText("(non lue)"), null);
  assert.ok(within(itemButton("n2")).getByText("(non lue)"));
});

test("liste paginee : le compteur serveur passe de 33 a 32 au clic, puis est relu", async () => {
  notifications = [notification("n1", "EVALUATION_SUBMITTED", { applicationId: "a1", evaluationId: "e1" })];
  total = 40;
  serverUnread = 33;
  mountHeader();
  await openDropdown();
  await waitFor(() => assert.equal(counter(), "33 non lues"));
  fireEvent.click(itemButton("n1"));
  assert.equal(badge(), "32");
  await reopenDropdown();
  await waitFor(() => assert.equal(counter(), "32 non lues"));
  // EVALUATION_SUBMITTED (admin) : dossier de la candidature concernee.
  assert.equal(window.location.search, "?application=a1");
});

test("notification deja lue : pas d'appel, compteur inchange, navigation", async () => {
  notifications = [notification("n1", "APPLICATION_SUBMITTED", { applicationId: "a9", isRead: true }), notification("n2", "APPLICATION_SUBMITTED", { applicationId: "a2" })];
  mountHeader();
  await openDropdown();
  fireEvent.click(itemButton("n1"));
  assert.equal(window.location.search, "?application=a9");
  assert.deepEqual(readCalls, []);
  await reopenDropdown();
  await waitFor(() => assert.equal(counter(), "1 non lues"));
});

test("notification sans cible : marquee lue, menu ferme, aucune navigation", async () => {
  notifications = [notification("n1", "DECISION_PUBLISHED")];
  mountHeader();
  await openDropdown();
  fireEvent.click(itemButton("n1"));
  await waitFor(() => assert.equal(popover(), null));
  assert.equal(window.location.pathname, "/dashboard/admin");
  assert.equal(window.location.search, "");
  await waitFor(() => assert.deepEqual(readCalls, ["n1"]));
});

test("double clic rapide : un seul appel et une seule navigation", async () => {
  notifications = [notification("n1", "APPLICATION_SUBMITTED", { applicationId: "a1" })];
  mountHeader();
  await openDropdown();
  const pending = deferred();
  readResponse = async (id) => { await pending.promise; markOnServer(id); return json({ count: 1 }); };
  const button = itemButton("n1");
  const historyLength = window.history.length;
  fireEvent.click(button);
  fireEvent.click(button);
  assert.equal(window.history.length, historyLength + 1);
  assert.equal(readCalls.length, 1);
  await act(async () => { pending.resolve(); await pending.promise; });
});

test("echec de l'API : navigation effectuee, etat restaure, aucune erreur bloquante", async () => {
  notifications = [notification("n1", "APPLICATION_SUBMITTED", { applicationId: "a1" })];
  readResponse = () => json({ message: "Erreur serveur" }, 500);
  mountHeader();
  await openDropdown();
  fireEvent.click(itemButton("n1"));
  assert.equal(window.location.search, "?application=a1");
  await waitFor(() => assert.equal(readCalls.length, 1));
  await waitFor(() => assert.equal(badge(), "1"));
  await reopenDropdown();
  // Pas lue cote serveur : elle redevient non lue et reste comptee.
  await waitFor(() => assert.equal(counter(), "1 non lues"));
  assert.ok(within(itemButton("n1")).getByText("(non lue)"));
});

test("« Voir tout » ouvre la page complete des notifications", async () => {
  notifications = [notification("n1", "APPLICATION_SUBMITTED", { applicationId: "a1" })];
  mountHeader();
  await openDropdown();
  const link = within(popover()).getByText("Voir tout");
  assert.equal(link.getAttribute("href"), "/dashboard/admin/notifications");
});

test("destinations par role : evaluateur et startup", async () => {
  auth.user.role = "EVALUATOR";
  notifications = [notification("n1", "APPLICATION_ASSIGNED", { applicationId: "a1", programId: "p1" }), notification("n2", "PROGRAM_ASSIGNED", { programId: "p1" })];
  const { unmount } = mountHeader();
  await openDropdown();
  fireEvent.click(itemButton("n2"));
  assert.equal(window.location.pathname, "/dashboard/evaluateur/assignments");
  unmount();

  auth.user.role = "STARTUP";
  notifications = [notification("n3", "DECISION_PUBLISHED", { applicationId: "a1", decisionId: "d1" })];
  mountHeader();
  await openDropdown();
  fireEvent.click(itemButton("n3"));
  assert.equal(window.location.pathname, "/dashboard/startup/candidatures");
});

test("page Notifications : « Consulter » suit la meme logique (lue puis navigation)", async () => {
  notifications = [notification("n1", "ALL_EVALUATIONS_COMPLETED", { applicationId: "a7", programId: "p1" })];
  render(h(NotificationProvider, {}, h(NotificationsPanel, {})));
  const consult = await screen.findByRole("button", { name: "Consulter" });
  fireEvent.click(consult);
  assert.equal(window.location.search, "?application=a7");
  await waitFor(() => assert.deepEqual(readCalls, ["n1"]));
});
