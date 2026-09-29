import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";
const { installDom } = await import("./dom-harness.mjs");
const dom = installDom();
const navigation = await import("./next-navigation-stub.mjs");
mock.module("next/navigation", { namedExports: { ...navigation } });
let auth;
mock.module("../../src/contexts/AuthContext.tsx", { namedExports: { useAuth: () => auth } });
const { createElement: h } = await import("react");
const { render, screen, fireEvent, waitFor, cleanup, within, act } = await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { ApplicationProvider } = await import("../../src/contexts/ApplicationContext.tsx");
const { StartupProvider, useStartups } = await import("../../src/contexts/StartupContext.tsx");
const { ProgramProvider } = await import("../../src/contexts/ProgramContext.tsx");
const { IncubationFollowupsProvider } = await import("../../src/contexts/IncubationFollowupsContext.tsx");
const { UserProvider } = await import("../../src/contexts/UserContext.tsx");
const { DashboardThemeProvider } = await import("../../src/contexts/DashboardThemeContext.tsx");
const { default: AdminApplications } = await import("../../src/components/dashboard/admin/AdminApplicationsManagement.tsx");
const { default: StartupManagement } = await import("../../src/components/dashboard/startup/StartupManagement.tsx");
const { default: StartupHome } = await import("../../src/components/dashboard/startup/StartupHome.tsx");
const { default: StartupPrograms } = await import("../../src/components/dashboard/startup/StartupPrograms.tsx");
const { default: Candidatures } = await import("../../src/components/dashboard/startup/StartupCandidaturesList.tsx");
const { default: AccountSettings } = await import("../../src/components/dashboard/account/AccountSettings.tsx");
const { default: FormInput } = await import("../../src/components/ui/forms/FormInput.tsx");
const { default: CreateUserModal } = await import("../../src/components/dashboard/admin/users/CreateUserModal.tsx");
const { dashboardNavByRole } = await import("../../src/lib/dashboard-nav.ts");

const startup = { id: "s1", ownerId: "u1", startupName: "EcoPack", status: "DRAFT", sector: "Climat", stage: "MVP", description: "Emballages durables" };
const program = { id: "p1", title: "Accélération", description: "Un accompagnement complet", isOpen: true, openDate: "2020-01-01", closeDate: "2099-12-31" };
const application = (id, status) => ({ id, status, startupId: "s1", programId: "p1", startup: { ...startup, startupName: `Startup ${id}` }, program, motivationLetter: "Notre projet", createdAt: "2026-01-01" });
let client, requests, apps, startups, programs, followUps, override;
const json = (data, status = 200, total) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...(total === undefined ? {} : { "X-Total-Count": String(total) }) } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  auth = { user: { id: "u1", role: "ADMIN", firstName: "Ada", lastName: "Lovelace", email: "ada@example.test", isActive: true, isEmailVerified: false }, token: "fixture-access", isAuthReady: true, isAuthenticated: true, async logout() {}, async loadProfile() {} };
  localStorage.setItem("token", auth.token);
  apps = [application("a1", "PENDING"), application("a2", "REJECTED"), application("a3", "ACCEPTED")];
  startups = [{ ...startup }]; programs = [{ ...program }]; followUps = []; requests = []; override = null;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  window.history.replaceState({}, "", "/dashboard/admin/applications");
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const request = { path: url.pathname.slice(1), params: url.searchParams, method: options.method || "GET", options };
    requests.push(request);
    if (override) { const result = await override(request); if (result) return result; }
    const { path, method } = request;
    if (path === "application") {
      if (method === "POST") { const created = { ...application("new", "PENDING"), ...JSON.parse(options.body) }; apps.push(created); return json(created); }
      let filtered = apps.filter(a => (!url.searchParams.get("status") || a.status === url.searchParams.get("status")) && (!url.searchParams.get("search") || a.startup.startupName.toLowerCase().includes(url.searchParams.get("search").toLowerCase())));
      const total = filtered.length, page = Number(url.searchParams.get("page") || 1), limit = Number(url.searchParams.get("limit") || total);
      filtered = filtered.slice((page - 1) * limit, page * limit);
      return json(filtered, 200, total);
    }
    if (path === "application/me") return json(apps);
    if (path.endsWith("/decision/revise")) { const app = apps.find(a => a.id === path.split("/")[1]); app.status = JSON.parse(options.body).status; return json({ id: "d1", status: app.status }); }
    if (path.startsWith("application/")) return json(apps.find(a => a.id === path.split("/")[1]));
    if (path === "startup/me") return json(startups);
    if (path === "startup" && method === "POST") { const created = { ...startup, ...JSON.parse(options.body) }; startups.push(created); return json(created); }
    if (path === "startup/s1/pitch-deck") { startups[0] = { ...startups[0], pitchDeckOriginalName: "deck.pdf", pitchDeckUploadedAt: "2026-09-29" }; return json(startups[0]); }
    if (path === "startup/s1/publish") { startups[0].status = "PUBLISHED"; return json(startups[0]); }
    if (path === "startup/s1" && method === "PATCH") { Object.assign(startups[0], JSON.parse(options.body)); return json(startups[0]); }
    if (path === "program/public") return json(programs);
    if (path === "incubation-followups/my") return json(followUps);
    if (path === "business-rules") return json({ MAX_STARTUPS_PER_USER: 5, MAX_ATTACHMENTS_PER_FOLLOWUP_UPDATE: 5 });
    if (path === "auth/resend-verification-email") return json({ message: "Email envoyé." });
    if (path === "users/change-password") return json({ message: "Mot de passe modifié" });
    throw new Error(`Unexpected ${method} ${path}`);
  };
});
afterEach(() => { cleanup(); client.clear(); });
after(() => dom.cleanup());

function mount(Component, props = {}) {
  return render(h(QueryClientProvider, { client }, h(StartupProvider, {}, h(ApplicationProvider, {}, h(ProgramProvider, {}, h(IncubationFollowupsProvider, {}, h(UserProvider, {}, h(DashboardThemeProvider, { darkMode: false, toggleDarkMode() {} }, h(Component, props)))))))));
}
const asStartup = () => { auth.user.role = "STARTUP"; };

test("filtres : chaque clic recharge immédiatement le statut et son vrai total", async () => {
  mount(AdminApplications);
  await screen.findByRole("button", { name: "Toutes (3)" });
  for (const [label, id] of [["Refusée", "a2"], ["En attente", "a1"], ["Acceptée", "a3"]]) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    await screen.findByRole("button", { name: `${label} (1)` });
    assert.ok(screen.getByText(`Startup ${id}`));
    assert.equal(document.querySelectorAll("tbody > tr").length, 1);
  }
  fireEvent.click(screen.getByRole("button", { name: "Toutes" }));
  await screen.findByRole("button", { name: "Toutes (3)" });
});

test("recherche globale : page 2 remise à 1, nom trouvé et compteur cohérent", async () => {
  apps = Array.from({ length: 30 }, (_, i) => application(`a${i}`, "PENDING"));
  window.history.replaceState({}, "", "/dashboard/admin/applications?page=2");
  mount(AdminApplications);
  await screen.findByText("Startup a29");
  fireEvent.change(screen.getByLabelText("Rechercher une candidature"), { target: { value: "Startup a1" } });
  await screen.findByRole("button", { name: "Toutes (11)" });
  assert.equal(new URLSearchParams(window.location.search).get("page"), null);
  assert.ok(screen.getByText("Startup a1"));
});

test("notification : sélection hors page sans ID dans la recherche, retour à toutes", async () => {
  window.history.replaceState({}, "", "/dashboard/admin/applications?application=a3");
  mount(AdminApplications);
  await screen.findByText("Startup a3");
  assert.equal(screen.getByLabelText("Rechercher une candidature").value, "");
  assert.equal(requests.filter(r => r.path === "application").length, 0);
  fireEvent.click(screen.getByRole("button", { name: "Voir toutes les candidatures" }));
  await screen.findByRole("button", { name: "Toutes (3)" });
});

test("navigation précédente : le filtre URL et les résultats restent synchronisés", async () => {
  mount(AdminApplications); await screen.findByRole("button", { name: "Toutes (3)" });
  fireEvent.click(screen.getByRole("button", { name: "Refusée" }));
  await screen.findByRole("button", { name: "Refusée (1)" });
  await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 30)); });
  await screen.findByRole("button", { name: "Toutes (3)" });
});

test("réponse tardive : un ancien PENDING ne remplace pas REJECTED", async () => {
  const gate = deferred();
  override = r => r.params.get("status") === "PENDING" ? gate.promise : null;
  mount(AdminApplications); await screen.findByRole("button", { name: "Toutes (3)" });
  fireEvent.click(screen.getByRole("button", { name: "En attente" }));
  fireEvent.click(screen.getByRole("button", { name: "Refusée" }));
  await screen.findByRole("button", { name: "Refusée (1)" });
  await act(async () => gate.resolve(json([apps[0]], 200, 1)));
  assert.equal(screen.queryByText("Startup a1"), null);
  assert.ok(screen.getByText("Startup a2"));
});

test("payload incohérent : erreur visible, aucun Pending affiché sous Rejected", async () => {
  override = r => r.params.get("status") === "REJECTED" ? json([apps[0]], 200, 1) : null;
  window.history.replaceState({}, "", "/dashboard/admin/applications?status=REJECTED");
  mount(AdminApplications);
  await screen.findByText(/ne correspond pas aux filtres/);
  assert.equal(screen.queryByText("Startup a1"), null);
  assert.ok(screen.getByRole("button", { name: "Réessayer" }));
});

test("pagination sans X-Total-Count : total inconnu et page suivante accessible", async () => {
  override = r => r.path === "application" ? json(Array.from({ length: 25 }, (_, i) => application(`a${i}`, "PENDING"))) : null;
  mount(AdminApplications);
  await screen.findByText(/Total non communiqué/);
  assert.equal(screen.getByRole("button", { name: "Suivant" }).disabled, false);
  assert.equal(screen.queryByRole("button", { name: "Toutes (25)" }), null);
});

test("révision de décision : conserve le filtre et retire le dossier changé de la liste", async () => {
  apps[1].decision = { id: "d1", status: "REJECTED" };
  window.history.replaceState({}, "", "/dashboard/admin/applications?status=REJECTED");
  mount(AdminApplications); await screen.findByRole("button", { name: "Refusée (1)" });
  fireEvent.click(screen.getByRole("button", { name: "Reviser" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Motif de la revision/), { target: { value: "Décision du comité corrigée" } });
  fireEvent.submit(dialog);
  await screen.findByRole("button", { name: "Refusée (0)" });
  assert.equal(screen.queryByText("Startup a1"), null);
  assert.ok(requests.filter(r => r.path === "application").every(r => r.params.get("status") === "REJECTED"));
});

test("pitch deck : publication bloquée pendant upload, puis publication sans logo", async () => {
  asStartup(); const gate = deferred();
  override = r => r.path === "startup/s1/pitch-deck" ? gate.promise : null;
  mount(StartupManagement); await screen.findByRole("heading", { name: "EcoPack" });
  fireEvent.change(screen.getByLabelText("Televerser un pitch deck"), { target: { files: [new File(["pdf"], "deck.pdf", { type: "application/pdf" })] } });
  await screen.findByRole("button", { name: "Téléversement en cours…" });
  assert.equal(screen.getByRole("button", { name: "Téléversement en cours…" }).disabled, true);
  assert.equal(screen.getByLabelText("Televerser un logo").disabled, true);
  await act(async () => gate.resolve(json({ ...startup, pitchDeckOriginalName: "deck.pdf", pitchDeckUploadedAt: "2026-09-29" })));
  fireEvent.click(screen.getByRole("button", { name: "Publier" }));
  await screen.findByText("Publiée");
  assert.equal(requests.filter(r => r.path.endsWith("/publish")).length, 1);
});

test("publication refusée : message API conservé et pitch deck toujours associé", async () => {
  asStartup(); startups[0].pitchDeckOriginalName = "deck.pdf";
  override = r => r.path.endsWith("/publish") ? json({ message: "Impossible de publier : validation du serveur indisponible." }, 400) : null;
  mount(StartupManagement); await screen.findByText("deck.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Publier" }));
  await screen.findByText(/validation du serveur indisponible/);
  assert.ok(screen.getByText("deck.pdf")); assert.ok(screen.getByText("Brouillon"));
});

test("nouveau brouillon : upload échoué garde le formulaire et réessai sans doublon", async () => {
  asStartup(); startups = []; let failUpload = true;
  override = r => r.path.endsWith("/pitch-deck") && failUpload ? json({ message: "Fichier refusé" }, 400) : null;
  mount(StartupManagement); await screen.findByText(/pas encore de startup/);
  fireEvent.click(screen.getByRole("button", { name: "Creer une startup" }));
  let dialog = screen.getByRole("dialog");
  for (const [label, value] of [[/Nom de la startup/, "EcoPack"], ["Secteur", "Climat"], ["Stade", "MVP"], ["Description", "Emballages durables"]]) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
  fireEvent.change(dialog.querySelector('input[type="file"]'), { target: { files: [new File(["pdf"], "deck.pdf", { type: "application/pdf" })] } });
  fireEvent.submit(dialog);
  await waitFor(() => assert.ok(screen.getAllByText(/profil est enregistré, mais/).length));
  dialog = screen.getByRole("dialog");
  assert.equal(within(dialog).getByLabelText(/Nom de la startup/).value, "EcoPack");
  failUpload = false; fireEvent.submit(dialog);
  await waitFor(() => assert.ok(!screen.queryByRole("dialog")));
  assert.equal(requests.filter(r => r.path === "startup" && r.method === "POST").length, 1);
  assert.equal(requests.filter(r => r.path === "startup/s1" && r.method === "PATCH").length, 1);
});

test("liste startup tardive : un ancien GET ne retire pas un pitch deck uploadé", async () => {
  asStartup(); const gate = deferred(); let exposed;
  function Probe() { exposed = useStartups(); return h("p", {}, exposed.myStartups[0]?.pitchDeckOriginalName || "Aucun deck"); }
  override = r => r.path === "startup/me" ? gate.promise : null;
  mount(Probe);
  let list;
  await act(async () => { list = exposed.fetchMyStartups(); });
  await act(async () => { await exposed.uploadPitchDeck("s1", new File(["pdf"], "deck.pdf")); });
  await act(async () => { gate.resolve(json([startup])); await list; });
  assert.ok(screen.getByText("deck.pdf"));
});

test("startup incubée : dashboard opérationnel, objectifs et actions existantes", async () => {
  asStartup(); followUps = [{ id: "f1", startup, program, startupId: "s1", programId: "p1", status: "ACTIVE", phase: "BUILD", progress: 40, objectives: [{ id: "o1", title: "Livrer le prototype", status: "TODO", priority: "HIGH", progress: 0, dueDate: "2026-10-01" }], updates: [] }];
  mount(StartupHome);
  await screen.findByRole("heading", { name: "Mon espace d’incubation" });
  assert.ok(screen.getByText("Livrer le prototype"));
  assert.ok(screen.getByRole("button", { name: "Mettre à jour" }));
  assert.equal(screen.queryByRole("heading", { name: "Programmes ouverts MEDIANET" }), null);
});

for (const status of [null, "COMPLETED", "SUSPENDED", "DROPPED"]) {
  test(`startup sans incubation ACTIVE (${status}) : programmes et candidatures`, async () => {
    asStartup(); if (status) followUps = [{ id: "f1", status }];
    mount(StartupHome);
    await screen.findByRole("heading", { name: "Préparez votre prochaine étape" });
    await screen.findAllByRole("heading", { name: "Accélération" });
    assert.equal(screen.queryByRole("heading", { name: "Mon espace d’incubation" }), null);
  });
}

test("erreur incubation : aucun faux dashboard sans incubation, réessai disponible", async () => {
  asStartup(); override = r => r.path === "incubation-followups/my" ? json({ message: "Indisponible" }, 503) : null;
  mount(StartupHome); await screen.findByRole("alert");
  assert.equal(screen.queryByRole("heading", { name: "Préparez votre prochaine étape" }), null);
  override = null; fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("heading", { name: "Préparez votre prochaine étape" });
});

test("programmes ouverts : exclus fermés, futurs, expirés et dates invalides", async () => {
  asStartup(); programs.push({ ...program, id: "closed", title: "Fermé", isOpen: false }, { ...program, id: "future", title: "Futur", openDate: "2099-01-01" }, { ...program, id: "past", title: "Expiré", closeDate: "2020-12-31" }, { ...program, id: "invalid", title: "Date invalide", closeDate: "invalide" });
  mount(StartupPrograms); await screen.findAllByRole("heading", { name: "Accélération" });
  for (const name of ["Fermé", "Futur", "Expiré", "Date invalide"]) assert.equal(screen.queryByRole("heading", { name }), null);
});

test("candidatures : décisions finales verrouillées, en attente sans badge verrouillé", async () => {
  asStartup(); mount(Candidatures);
  await screen.findByText("Acceptée");
  assert.equal(screen.getAllByText("Verrouillée").length, 2);
  assert.equal(screen.queryByText("s1"), null);
});

test("sidebar : STARTUP programmes ouverts, ADMIN suivi conservé, EVALUATOR évaluations", () => {
  assert.ok(dashboardNavByRole.STARTUP.some(item => item.href === "/dashboard/startup/programs"));
  assert.equal(dashboardNavByRole.STARTUP.some(item => item.href.endsWith("incubation-followups")), false);
  assert.ok(dashboardNavByRole.ADMIN.some(item => item.href.endsWith("incubation-followups")));
  assert.ok(dashboardNavByRole.EVALUATOR.some(item => item.href.endsWith("reviews")));
});

test("mot de passe : masqué au montage, chaque œil indépendant et sans soumission", () => {
  let submissions = 0;
  render(h("form", { onSubmit: () => { submissions++; } }, h(FormInput, { id: "secret", type: "password", defaultValue: "StrongPass123!" }), h(FormInput, { id: "confirmation", type: "password" })));
  assert.equal(document.getElementById("secret").type, "password");
  fireEvent.click(screen.getAllByRole("button", { name: "Afficher le mot de passe" })[0]);
  assert.equal(document.getElementById("secret").type, "text");
  assert.equal(document.getElementById("confirmation").type, "password");
  assert.equal(submissions, 0);
  fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
  assert.equal(document.getElementById("secret").type, "password");
});

test("profil : actif ne signifie pas vérifié, renvoi avec délai et message", async () => {
  mount(AccountSettings);
  assert.ok(screen.getByText("Compte actif")); assert.ok(screen.getByText("Email non vérifié"));
  fireEvent.click(screen.getByRole("button", { name: "Renvoyer l’email de vérification" }));
  await screen.findByText("Email envoyé.");
  assert.equal(screen.getByRole("button", { name: /Réessayer dans/ }).disabled, true);
  assert.ok(screen.getByText("Email non vérifié"));
  assert.equal(requests.find(r => r.path === "auth/resend-verification-email").options.body, JSON.stringify({ email: auth.user.email }));
});

test("profil : vérification absente ne devient jamais Email vérifié", () => {
  delete auth.user.isEmailVerified; mount(AccountSettings);
  assert.ok(screen.getByText("Statut de vérification non communiqué"));
  assert.equal(screen.queryByText("Email vérifié"), null);
});

test("profil : changement du mot de passe envoie les bons champs et efface les valeurs", async () => {
  mount(AccountSettings);
  fireEvent.change(screen.getByLabelText("Mot de passe actuel"), { target: { value: "OldPassword1!" } });
  fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), { target: { value: "NewPassword1!" } });
  fireEvent.change(screen.getByLabelText("Confirmer le nouveau mot de passe"), { target: { value: "NewPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe" }));
  await screen.findByText(/Mot de passe mis a jour/);
  assert.equal(screen.getByLabelText("Mot de passe actuel").value, "");
  const request = requests.find(r => r.path === "users/change-password");
  assert.equal(request.method, "PATCH");
  assert.deepEqual(JSON.parse(request.options.body), { currentPassword: "OldPassword1!", newPassword: "NewPassword1!" });
});

test("création admin : mot de passe proposé masqué et modifiable", () => {
  let changed;
  render(h(CreateUserModal, { isOpen: true, isSubmitting: false, values: { firstName: "", lastName: "", email: "", password: "StrongPass123!", role: "STARTUP" }, onChange: value => { changed = value; }, onClose() {}, onSubmit() {} }));
  const password = screen.getByLabelText(/^Mot de passe/);
  assert.equal(password.type, "password"); assert.equal(password.value, "StrongPass123!");
  fireEvent.change(password, { target: { value: "AnotherPassword1!" } });
  assert.equal(changed.password, "AnotherPassword1!");
});
