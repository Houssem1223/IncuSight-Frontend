import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";
import { initialFollowUps, programs, applications, admin, listResponse, detailResponse } from "./incubation-fixtures.mjs";

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";
const { installDom } = await import("./dom-harness.mjs");
const dom = installDom();
const navigation = await import("./next-navigation-stub.mjs");
mock.module("next/navigation", { namedExports: { ...navigation } });
let auth;
mock.module("../../src/contexts/AuthContext.tsx", { namedExports: { useAuth: () => auth } });
const applicationContext = { applications, isApplicationsLoading: false, applicationsError: null, clearApplicationsError() {}, async fetchAllApplications() { return applications; } };
const programContext = { programs, async fetchAllPrograms() { return programs; } };
mock.module("../../src/contexts/ApplicationContext.tsx", { namedExports: { useApplications: () => applicationContext } });
mock.module("../../src/contexts/ProgramContext.tsx", { namedExports: { usePrograms: () => programContext } });
const { createElement: h } = await import("react");
const { render, screen, fireEvent, waitFor, cleanup, within, act } = await import("@testing-library/react");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { IncubationFollowupsProvider } = await import("../../src/contexts/IncubationFollowupsContext.tsx");
const { default: Management } = await import("../../src/components/dashboard/admin/AdminIncubationFollowupsManagement.tsx");
let followUps, requests, client, failures, ready;

beforeEach(() => {
  followUps = structuredClone(initialFollowUps); requests = []; failures = new Set(); ready = false;
  auth = { user: admin, token: "test-admin-token", isAuthReady: true, isAuthenticated: true };
  window.localStorage.setItem("token", auth.token);
  window.history.replaceState({}, "", "/dashboard/admin/incubation-followups");
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\//, "");
    const method = options.method || "GET";
    const payload = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ path, method, payload, params: url.searchParams });
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
    if (failures.has(path)) return json({ message: "Indisponible" }, 403);
    if (path === "incubation-followups") return json(followUps);
    if (path === "admin/startup-vigilance") return json(listResponse(followUps));
    if (path.startsWith("admin/startup-vigilance/")) {
      const id = path.split("/")[2];
      if (method === "POST") ready = true;
      return json(detailResponse(followUps.find(f => f.id === id), ready));
    }
    if (path.startsWith("incubation-followups/application/")) {
      const created = { ...structuredClone(initialFollowUps[0]), id: "f5", applicationId: "a5", startupId: "s5", startup: applications[0].startup };
      followUps.push(created); return json(created);
    }
    if (path.startsWith("incubation-followups/objectivesAdmin/")) {
      const objective = followUps.flatMap(f => f.objectives).find(o => o.id === path.split("/")[2]);
      Object.assign(objective, payload); return json(objective);
    }
    if (path.startsWith("incubation-followups/")) {
      const followUp = followUps.find(f => f.id === path.split("/")[1]);
      if (path.endsWith("/objectives")) {
        const objective = { id: "added-objective", followUpId: followUp.id, status: "TODO", progress: 0, ...payload };
        followUp.objectives.push(objective); return json(objective);
      }
      Object.assign(followUp, payload); return json(followUp);
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  };
});
afterEach(() => { cleanup(); client.clear(); });
after(() => dom.cleanup());

async function mount(query = "") {
  window.history.replaceState({}, "", `/dashboard/admin/incubation-followups${query}`);
  const view = render(h(QueryClientProvider, { client }, h(IncubationFollowupsProvider, {}, h(Management))));
  if (auth.user.role === "ADMIN") {
    if (followUps.length) await screen.findByRole("button", { name: /EcoPack/ });
    else await screen.findByRole("heading", { name: "Aucune startup en incubation" });
  }
  return view;
}
async function selected(tab) {
  await mount(`?followUp=f1${tab ? `&tab=${tab}` : ""}`);
  await screen.findByRole("heading", { name: "EcoPack" });
  await waitFor(() => assert.ok(screen.getByText("11/100 · Faible")));
}
const chooseTab = name => fireEvent.click(screen.getByRole("tab", { name }));
const panel = () => screen.getByRole("tabpanel");
const mutations = () => requests.filter(r => r.method !== "GET");

test("workspace : liste serveur et invitation sans sélection", async () => {
  await mount();
  assert.equal(screen.getAllByRole("button", { name: /Vigilance faible/ }).length, 4);
  assert.ok(screen.getByText("Sélectionnez une startup pour consulter son suivi."));
  assert.equal(screen.queryByRole("tablist"), null);
});
test("sélection : startup visible, URL conservée et overview par défaut", async () => {
  await mount("?programId=p1&sort=score_asc&custom=keep");
  fireEvent.click(screen.getByRole("button", { name: /EcoPack/ }));
  await screen.findByRole("heading", { name: "EcoPack" });
  const params = new URLSearchParams(window.location.search);
  assert.equal(params.get("followUp"), "f1"); assert.equal(params.get("programId"), "p1"); assert.equal(params.get("custom"), "keep");
  assert.equal(screen.getByRole("tab", { name: "Vue d’ensemble" }).getAttribute("aria-selected"), "true");
});
for (const [tab, name, heading] of [["objectives", /^Objectifs/, "Objectifs"], ["journal", /^Journal/, "Journal d’avancement"], ["vigilance", "Vigilance & IA", "Vigilance & accompagnement"], ["notes", "Notes", "Notes internes"]]) {
  test(`onglet ${tab} : clic, URL et contenu exclusif`, async () => {
    await selected(); chooseTab(name);
    await screen.findByRole("heading", { name: heading });
    assert.equal(new URLSearchParams(window.location.search).get("tab"), tab);
    assert.equal(screen.queryByRole("heading", { name: "Le suivi en un coup d’œil" }), null);
  });
}
test("URL partagée / remontage : startup et onglet conservés", async () => {
  const view = await mount("?followUp=f2&tab=notes&level=LOW&page=2&period=custom&from=2026-08-01&to=2026-09-30");
  await screen.findByDisplayValue("Contexte de MediSync");
  const url = window.location.search;
  view.unmount(); await mount(url);
  await screen.findByDisplayValue("Contexte de MediSync");
  assert.equal(window.location.search, url);
});
test("onglet inconnu : synthèse de secours", async () => { await selected("unknown"); assert.ok(screen.getByRole("heading", { name: "Le suivi en un coup d’œil" })); });
test("overview : compteurs, prochaine échéance et trois activités récentes", async () => {
  await selected();
  assert.ok(within(panel()).getByText("1 / 2"));
  assert.ok(within(panel()).getByText("Lancer la campagne B2B"));
  const recent = panel().querySelectorAll(".inc-recent li");
  assert.equal(recent.length, 3); assert.match(recent[0].textContent, /Point du 4 septembre/);
  assert.equal(within(panel()).queryByText("Point du 1 septembre"), null);
});
for (const [label, tab] of [["Voir les objectifs →", "objectives"], ["Voir le journal →", "journal"], ["Voir l’analyse de vigilance →", "vigilance"]]) {
  test(`overview : ${label}`, async () => { await selected(); fireEvent.click(screen.getByRole("button", { name: label })); assert.equal(new URLSearchParams(window.location.search).get("tab"), tab); });
}
test("objectifs : liste et filtre terminés", async () => {
  await selected("objectives");
  assert.ok(screen.getByText("Lancer la campagne B2B"));
  fireEvent.click(within(screen.getByRole("group", { name: "Filtrer les objectifs" })).getByRole("button", { name: /Termin/ }));
  assert.ok(screen.getByText("Finaliser le prototype")); assert.equal(screen.queryByText("Lancer la campagne B2B"), null);
});
test("objectif : ajout depuis le formulaire existant jusqu'au POST", async () => {
  await selected("objectives"); fireEvent.click(screen.getByRole("button", { name: "Ajouter un objectif" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Titre/), { target: { value: "Préparer le demo day" } });
  fireEvent.submit(dialog);
  await screen.findByRole("heading", { name: "Préparer le demo day" });
  assert.equal(mutations()[0].path, "incubation-followups/f1/objectives"); assert.equal(mutations()[0].payload.title, "Préparer le demo day");
});
test("objectif : modification jusqu'au PATCH", async () => {
  await selected("objectives"); fireEvent.click(screen.getAllByRole("button", { name: "Modifier" })[0]);
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Titre/), { target: { value: "Campagne partenaires" } });
  fireEvent.submit(dialog);
  await screen.findByRole("heading", { name: "Campagne partenaires" });
  assert.equal(mutations()[0].path, "incubation-followups/objectivesAdmin/o0a");
});
test("suivi clos : objectifs verrouillés, notes encore éditables", async () => {
  followUps[0].status = "COMPLETED"; await selected("objectives");
  assert.ok(screen.getByRole("button", { name: "Ajouter un objectif" }).disabled);
  chooseTab("Notes"); assert.equal(screen.getByLabelText("Notes d’accompagnement").disabled, false);
});
test("journal : ordre récent, accordéon et détails accessibles", async () => {
  await selected("journal");
  const entries = panel().querySelectorAll("article"); assert.equal(entries.length, 4); assert.match(entries[0].textContent, /Point du 4 septembre/);
  const detail = entries[0].querySelector("details"); assert.equal(detail.open, false);
  fireEvent.click(detail.querySelector("summary")); assert.equal(detail.open, true); assert.match(detail.textContent, /Mise en relation avec un mentor/);
});
test("vigilance : score conservé, génération seulement sur clic, sources repliées", async () => {
  await selected("vigilance"); assert.equal(mutations().length, 0);
  fireEvent.click(screen.getByRole("button", { name: /Générer/ }));
  await screen.findByText(/La startup progresse régulièrement/);
  assert.equal(mutations()[0].path, "admin/startup-vigilance/f1/analyze");
  const issue = screen.getByText("Problèmes identifiés").closest("details"); assert.equal(issue.open, false);
  fireEvent.click(issue.querySelector("summary")); assert.equal(issue.open, true);
  assert.ok(within(issue).getByText(/Mise à jour du/));
});
test("navigation d'onglets : aucun GET détail supplémentaire ni POST IA", async () => {
  await selected(); const count = requests.length;
  chooseTab("Vigilance & IA"); chooseTab("Notes"); chooseTab(/^Journal/); chooseTab("Vue d’ensemble");
  await act(async () => {});
  assert.equal(requests.length, count); assert.equal(mutations().length, 0);
});
test("notes : brouillon conservé entre onglets et sauvegarde PATCH", async () => {
  await selected("notes");
  fireEvent.change(screen.getByLabelText("Notes d’accompagnement"), { target: { value: "Contacter le mentor" } });
  chooseTab(/^Journal/); chooseTab("Notes");
  assert.equal(screen.getByLabelText("Notes d’accompagnement").value, "Contacter le mentor");
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer les notes" }));
  await waitFor(() => assert.equal(followUps[0].notes, "Contacter le mentor"));
  assert.deepEqual(mutations()[0].payload, { notes: "Contacter le mentor" });
});
test("changement startup : les notes ne fuient pas vers le dossier suivant", async () => {
  await selected("notes"); fireEvent.click(screen.getByRole("button", { name: /MediSync/ }));
  await screen.findByDisplayValue("Contexte de MediSync");
});
test("historique : Back et Forward des startups", async () => {
  await selected(); fireEvent.click(screen.getByRole("button", { name: /MediSync/ }));
  await screen.findByRole("heading", { name: "MediSync" });
  await act(async () => { window.history.back(); await new Promise(r => setTimeout(r, 30)); });
  await screen.findByRole("heading", { name: "EcoPack" });
  await act(async () => { window.history.forward(); await new Promise(r => setTimeout(r, 30)); });
  await screen.findByRole("heading", { name: "MediSync" });
});
test("historique : Back et Forward des onglets", async () => {
  await selected(); chooseTab("Notes"); chooseTab(/^Journal/);
  await act(async () => { window.history.back(); await new Promise(r => setTimeout(r, 30)); });
  await screen.findByRole("heading", { name: "Notes internes" });
  await act(async () => { window.history.forward(); await new Promise(r => setTimeout(r, 30)); });
  await screen.findByRole("heading", { name: "Journal d’avancement" });
});
test("mobile : retour à la liste retire la sélection et garde les filtres", async () => {
  await selected("notes"); fireEvent.click(screen.getByRole("button", { name: "Retour aux startups" }));
  assert.equal(new URLSearchParams(window.location.search).has("followUp"), false);
  assert.equal(document.querySelector(".inc-workspace").dataset.selected, "false");
  assert.equal(screen.queryByRole("tabpanel"), null);
});
test("création depuis l’état vide : modale, candidature acceptée et sélection du nouveau suivi", async () => {
  followUps = [];
  await mount(); fireEvent.click(screen.getAllByRole("button", { name: "Créer un suivi" })[0]);
  const dialog = screen.getByRole("dialog", { name: "Nouveau suivi" });
  fireEvent.change(within(dialog).getByLabelText("Candidature acceptée"), { target: { value: "a5" } }); fireEvent.submit(dialog);
  await screen.findByRole("heading", { name: "GreenLoop" });
  assert.equal(screen.queryByRole("dialog"), null); assert.equal(mutations()[0].path, "incubation-followups/application/a5");
});
test("phase : modification persistée et liste invalidée", async () => {
  await selected(); fireEvent.change(screen.getByLabelText("Changer la phase du suivi"), { target: { value: "CLOSING" } });
  await waitFor(() => assert.equal(followUps[0].phase, "CLOSING")); assert.deepEqual(mutations()[0].payload, { phase: "CLOSING" });
});
test("statut : confirmation et date de fin existante conservées", async () => {
  await selected(); fireEvent.change(screen.getByLabelText("Changer le statut du suivi"), { target: { value: "COMPLETED" } });
  assert.equal(mutations().length, 0); fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
  await waitFor(() => assert.equal(followUps[0].status, "COMPLETED"));
  assert.equal(mutations()[0].payload.endDate, new Date().toISOString().slice(0, 10));
});
test("sidebar : recherche serveur et préservation startup / onglet", async () => {
  await selected("notes"); fireEvent.change(screen.getByLabelText("Rechercher une startup"), { target: { value: "Eco" } });
  await waitFor(() => assert.ok(requests.some(r => r.params.get("search") === "Eco")));
  assert.equal(new URLSearchParams(window.location.search).get("tab"), "notes"); assert.equal(new URLSearchParams(window.location.search).get("followUp"), "f1");
});
test("accessibilité : flèches, Home/End et focus des onglets", async () => {
  await selected(); const tabs = screen.getAllByRole("tab");
  fireEvent.keyDown(tabs[0], { key: "ArrowRight" }); assert.equal(document.activeElement, tabs[1]);
  fireEvent.keyDown(tabs[1], { key: "End" }); assert.equal(document.activeElement, tabs[4]);
  fireEvent.keyDown(tabs[4], { key: "Home" }); assert.equal(document.activeElement, tabs[0]);
});
test("modale : portail body, focus piégé et restauré après Escape", async () => {
  await selected("objectives"); const trigger = screen.getByRole("button", { name: "Ajouter un objectif" }); trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog"); assert.equal(dialog.closest(".inc-workspace"), null);
  const first = within(dialog).getByRole("button", { name: "Fermer" });
  assert.equal(document.activeElement, first); fireEvent.keyDown(first, { key: "Tab", shiftKey: true }); assert.notEqual(document.activeElement, first);
  fireEvent.keyDown(window, { key: "Escape" }); assert.equal(screen.queryByRole("dialog"), null); assert.equal(document.activeElement, trigger);
});
test("vigilance indisponible : les notes restent accessibles", async () => {
  failures.add("admin/startup-vigilance/f1"); await mount("?followUp=f1&tab=vigilance");
  await screen.findByRole("alert"); chooseTab("Notes"); await screen.findByDisplayValue("Contexte de EcoPack");
  assert.equal(screen.queryByRole("alert"), null);
});
test("liste en erreur : le dossier direct reste utilisable", async () => {
  failures.add("admin/startup-vigilance");
  window.history.replaceState({}, "", "/dashboard/admin/incubation-followups?followUp=f1&tab=notes");
  render(h(QueryClientProvider, { client }, h(IncubationFollowupsProvider, {}, h(Management))));
  await screen.findByDisplayValue("Contexte de EcoPack"); assert.ok(await screen.findByRole("button", { name: "Réessayer la liste" }));
});
test("RoleGuard : un évaluateur ne voit pas le workspace admin", async () => {
  auth = { ...auth, user: { ...admin, role: "EVALUATOR" } }; await mount();
  assert.equal(screen.queryByRole("heading", { name: "Suivi incubation" }), null);
});
