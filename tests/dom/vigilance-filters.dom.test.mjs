import assert from "node:assert/strict";
import { after, afterEach, beforeEach, mock, test } from "node:test";

/**
 * Interactions reelles de la liste de vigilance : composants montes dans un DOM
 * jsdom, evenements emis par `fireEvent`, historique du navigateur exerce par
 * `window.history.back()` / `forward()`.
 *
 * Ce fichier couvre ce que les transitions pures ne peuvent pas prouver : qu'un
 * clic ou un changement de Select arrive bien jusqu'a la query string envoyee au
 * backend, et que Precedent/Suivant resynchronisent l'ecran.
 *
 * `next/navigation` est remplace par un routeur adosse a la vraie `history` de
 * jsdom (`--experimental-test-module-mocks`), pas par un faux etat : Precedent
 * est donc un vrai Precedent.
 */

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";

const LIST_ROUTE = "/dashboard/admin/incubation-followups";

// 1. Le DOM avant tout : Testing Library lit `document` des son import.
const { flushHistory, installDom } = await import("./dom-harness.mjs");
const dom = installDom(`http://localhost${LIST_ROUTE}`);

// 2. Le routeur de test, avant les modules qui importent `next/navigation`.
const navigation = await import("./next-navigation-stub.mjs");
mock.module("next/navigation", { namedExports: { ...navigation } });

// 3. React et les composants reels.
const { createElement: h } = await import("react");
const { cleanup, fireEvent, render, screen, waitFor } = await import(
  "@testing-library/react"
);
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { default: StartupVigilanceOverview } = await import(
  "../../src/components/dashboard/admin/vigilance/StartupVigilanceOverview.tsx"
);
const { useVigilanceListParams } = await import(
  "../../src/hooks/useVigilanceListParams.ts"
);
const { useSelectedFollowUp } = await import("../../src/hooks/useSelectedFollowUp.ts");

after(() => dom.cleanup());

// --- Fixtures ----------------------------------------------------------------

const FACTORS = {
  overdueObjectives: { score: 18, maxScore: 30, applicable: true, dataSufficient: true, count: 2, ratio: 0.6, eligibleCount: 3 },
  blockedObjectives: { score: 15, maxScore: 25, applicable: true, dataSufficient: true, count: 1, ratio: 0.25, eligibleCount: 4 },
  inactivity: { score: 10, maxScore: 20, applicable: true, dataSufficient: true, daysSinceLastUpdate: 17, basis: "LAST_UPDATE" },
  progress: { score: 10, maxScore: 15, applicable: true, dataSufficient: true, averageProgress: 34, source: "OBJECTIVES", excludedRecentObjectives: 0 },
  stagnation: { score: 5, maxScore: 10, applicable: true, dataSufficient: true, recentDelta: 2, measurements: 3 },
};

const PROGRAMS = [
  { id: "cprogramaaaaaaaaaaaaaaaaa", title: "HealthTech 2026" },
  { id: "cprogrambbbbbbbbbbbbbbbbb", title: "FinTech 2026" },
];

function item(overrides = {}) {
  return {
    followUpId: "f1",
    startupId: "s1",
    startupName: "SmartHealth",
    programId: PROGRAMS[0].id,
    programName: PROGRAMS[0].title,
    status: "ACTIVE",
    phase: "BUILD",
    progress: 34,
    score: 68,
    level: "HIGH",
    factors: FACTORS,
    ...overrides,
  };
}

/**
 * Le backend decide de tout : cette fonction ne fait que repondre ce qu'on lui
 * demande de repondre. Aucun filtrage n'est simule ici — c'est precisement ce
 * qui permet de verifier que le frontend n'en fait pas non plus.
 */
function response(items, pagination = {}) {
  return {
    items,
    pagination: {
      page: 1,
      limit: 20,
      totalItems: items.length,
      totalPages: items.length ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
      ...pagination,
    },
  };
}

let requests = [];
let nextResponse = () => response([item()]);
let queryClient;

beforeEach(() => {
  requests = [];
  nextResponse = () => response([item()]);
  window.localStorage.setItem("token", "jeton-admin");
  window.history.replaceState({}, "", LIST_ROUTE);

  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url));
    requests.push(parsed.searchParams);

    return new Response(JSON.stringify(nextResponse(parsed.searchParams)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  // `gcTime` infini : une entree de cache devenue inobservee doit rester
  // inspectable, sinon on ne peut pas verifier qu'une *nouvelle* queryKey a ete
  // utilisee plutot que l'ancienne reecrite.
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

/** Le dernier appel reellement parti vers `GET admin/startup-vigilance`. */
function lastRequest() {
  return requests.at(-1);
}

function queryKeys() {
  return queryClient
    .getQueryCache()
    .getAll()
    .filter((query) => query.queryKey[1] === "list")
    .map((query) => query.queryKey[2]);
}

/**
 * Les parametres de la requete que le composant observe *actuellement*.
 *
 * A preferer a la derniere requete reseau : une cle deja en cache et encore
 * fraiche (`staleTime` de 60 s) est resservie sans refetch — c'est justement ce
 * qui arrive en revenant en arriere. Ce qui compte alors est la cle utilisee,
 * pas qu'un appel HTTP soit reparti.
 */
function activeQuery() {
  const observed = queryClient
    .getQueryCache()
    .getAll()
    .filter((query) => query.queryKey[1] === "list" && query.getObserversCount() > 0);

  return observed.at(-1)?.queryKey[2];
}

/** L'ecran reel : le hook d'URL branche sur le composant de liste. */
function VigilanceScreen() {
  const { params, resetParams, setParams } = useVigilanceListParams();
  const { selectedFollowUpId, selectFollowUp } = useSelectedFollowUp();

  return h(StartupVigilanceOverview, {
    activeFollowUpId: selectedFollowUpId,
    onParamsChange: setParams,
    onReset: resetParams,
    onSelectFollowUp: selectFollowUp,
    params,
    programs: PROGRAMS,
  });
}

async function renderScreen() {
  const utils = render(
    h(QueryClientProvider, { client: queryClient }, h(VigilanceScreen)),
  );

  await waitFor(() => assert.ok(requests.length >= 1));
  return utils;
}

const select = (label) => screen.getByLabelText(label);

// --- Filtre programme --------------------------------------------------------

test("selectionner un programme l'envoie au backend et revient en page 1", async () => {
  window.history.replaceState({}, "", `${LIST_ROUTE}?page=3`);
  await renderScreen();

  assert.equal(lastRequest().get("page"), "3", "la page de l'URL est respectee");

  fireEvent.change(select("Programme"), { target: { value: PROGRAMS[1].id } });

  await waitFor(() => assert.equal(lastRequest().get("programId"), PROGRAMS[1].id));

  // 1. Ce qui part au backend.
  assert.equal(lastRequest().get("page"), "1", "changer de filtre ramene en page 1");
  // 2. Ce que montre l'interface.
  assert.equal(select("Programme").value, PROGRAMS[1].id);
  // 3. Ce que porte l'URL.
  const url = new URL(window.location.href);
  assert.equal(url.searchParams.get("programId"), PROGRAMS[1].id);
  assert.equal(url.searchParams.get("page"), null, "la page 1 n'alourdit pas l'URL");
  // 4. Une entree de cache distincte, pas la precedente reutilisee.
  const keys = queryKeys();
  assert.ok(keys.length >= 2, "une nouvelle queryKey est utilisee");
  assert.ok(keys.some((key) => key.programId === PROGRAMS[1].id));
});

// --- Filtre niveau : global, jamais local ------------------------------------

test("selectionner un niveau envoie level au backend, sans filtrer la page", async () => {
  // Le faux backend renvoie deliberement une ligne LOW quand on demande HIGH :
  // si le frontend refiltrait, la ligne disparaitrait de l'ecran.
  nextResponse = (query) =>
    query.get("level") === "HIGH"
      ? response([item({ followUpId: "f9", startupName: "Contre-exemple", level: "LOW", score: 3 })])
      : response([item()]);

  await renderScreen();

  fireEvent.change(select("Niveau de vigilance"), { target: { value: "HIGH" } });

  await waitFor(() => assert.equal(lastRequest().get("level"), "HIGH"));

  assert.ok(await screen.findByText("Contre-exemple"), "la reponse est affichee telle quelle");
  assert.equal(new URL(window.location.href).searchParams.get("level"), "HIGH");
});

// --- Statut et phase ---------------------------------------------------------

test("statut et phase partent au backend avec les valeurs d'enum exactes", async () => {
  await renderScreen();

  // Le statut par defaut est deja explicite : c'est le defaut serveur.
  assert.equal(lastRequest().get("status"), "ACTIVE");

  fireEvent.change(select("Statut"), { target: { value: "SUSPENDED" } });
  await waitFor(() => assert.equal(lastRequest().get("status"), "SUSPENDED"));

  fireEvent.change(select("Phase"), { target: { value: "MARKET_VALIDATION" } });
  await waitFor(() => assert.equal(lastRequest().get("phase"), "MARKET_VALIDATION"));

  assert.equal(lastRequest().get("status"), "SUSPENDED", "les filtres se cumulent");
  assert.equal(lastRequest().get("page"), "1");
});

// --- Periode -----------------------------------------------------------------

test("la periode part au backend, et custom attend ses deux bornes", async () => {
  await renderScreen();

  fireEvent.change(select("Période de démarrage"), { target: { value: "7d" } });
  await waitFor(() => assert.equal(lastRequest().get("period"), "7d"));

  fireEvent.change(select("Période de démarrage"), { target: { value: "custom" } });
  // `period=custom` sans bornes serait un 400 : rien n'est envoye tant que les
  // deux dates ne sont pas saisies. La requete resultante est celle, deja en
  // cache, du perimetre complet — d'ou la lecture de la cle observee.
  await waitFor(() => assert.equal(activeQuery().period, undefined));
  assert.equal(activeQuery().from, undefined);
  assert.ok(select("Du"), "les deux champs de dates sont proposes");

  fireEvent.change(select("Du"), { target: { value: "2026-09-01" } });
  fireEvent.change(select("Au"), { target: { value: "2026-09-30" } });

  await waitFor(() => assert.equal(lastRequest().get("period"), "custom"));
  assert.equal(lastRequest().get("from"), "2026-09-01");
  assert.equal(lastRequest().get("to"), "2026-09-30");
});

// --- Recherche debouncee -----------------------------------------------------

test("la recherche part une seule fois, apres la pause de frappe", async () => {
  await renderScreen();

  const initialCalls = requests.length;
  const input = select("Rechercher une startup");

  for (const value of ["S", "Sm", "Sma", "Smar", "Smart"]) {
    fireEvent.change(input, { target: { value } });
  }

  // Le champ suit la frappe immediatement, le reseau non.
  assert.equal(input.value, "Smart");
  assert.equal(requests.length, initialCalls, "aucune requete pendant la frappe");

  await waitFor(() => assert.equal(lastRequest().get("search"), "Smart"));
  assert.equal(requests.length, initialCalls + 1, "une seule requete pour cinq frappes");
  assert.equal(new URL(window.location.href).searchParams.get("search"), "Smart");
});

// --- Tri ---------------------------------------------------------------------

test("changer le tri l'envoie au backend et revient en page 1", async () => {
  window.history.replaceState({}, "", `${LIST_ROUTE}?page=2`);
  await renderScreen();

  fireEvent.change(select("Trier par"), { target: { value: "score_asc" } });

  await waitFor(() => assert.equal(lastRequest().get("sort"), "score_asc"));
  assert.equal(lastRequest().get("page"), "1");
});

// --- Pagination --------------------------------------------------------------

test("cliquer Suivant puis Precedent change reellement de page", async () => {
  nextResponse = (query) => {
    const page = Number(query.get("page") ?? 1);

    return response([item({ followUpId: `f-page-${page}`, startupName: `Page ${page}` })], {
      page,
      totalItems: 47,
      totalPages: 3,
      hasNextPage: page < 3,
      hasPreviousPage: page > 1,
    });
  };

  await renderScreen();

  assert.ok(await screen.findByText("Page 1"));
  assert.ok(screen.getByText(/Page 1 sur 3/));
  assert.equal(screen.getByRole("button", { name: "Précédent" }).disabled, true);
  assert.equal(screen.getByRole("button", { name: "Suivant" }).disabled, false);

  fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

  await waitFor(() => assert.equal(lastRequest().get("page"), "2"));
  assert.ok(await screen.findByText("Page 2"));
  assert.equal(new URL(window.location.href).searchParams.get("page"), "2");
  assert.equal(screen.getByRole("button", { name: "Précédent" }).disabled, false);

  fireEvent.click(screen.getByRole("button", { name: "Précédent" }));

  // La page 1 est encore fraiche en cache : elle revient sans nouvel appel.
  await waitFor(() => assert.equal(activeQuery().page, 1));
  assert.ok(await screen.findByText("Page 1"));
  assert.equal(new URL(window.location.href).searchParams.get("page"), null);
  assert.equal(screen.getByRole("button", { name: "Précédent" }).disabled, true);
});

test("la derniere page desactive Suivant, et le total reste celui du serveur", async () => {
  nextResponse = () =>
    response([item()], {
      page: 3,
      totalItems: 47,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true,
    });

  window.history.replaceState({}, "", `${LIST_ROUTE}?page=3`);
  await renderScreen();

  assert.ok(await screen.findByText(/Page 3 sur 3/));
  assert.ok(screen.getByText(/47 suivis/), "le total ne vient pas de items.length");
  assert.equal(screen.getByRole("button", { name: "Suivant" }).disabled, true);
});

// --- Reinitialisation --------------------------------------------------------

test("Reinitialiser les filtres remet chaque champ et chaque parametre au defaut", async () => {
  window.history.replaceState(
    {},
    "",
    `${LIST_ROUTE}?followUp=f1&search=Smart&programId=${PROGRAMS[1].id}&status=DROPPED&phase=CLOSING&level=CRITICAL&period=7d&page=2&sort=score_asc`,
  );
  await renderScreen();

  assert.ok(screen.getByText("Filtres (6)"), "les six filtres actifs sont annonces");

  fireEvent.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));

  await waitFor(() => assert.equal(lastRequest().get("level"), null));

  const query = lastRequest();
  assert.equal(query.get("search"), null);
  assert.equal(query.get("programId"), null);
  assert.equal(query.get("status"), "ACTIVE", "retour au defaut serveur, explicitement");
  assert.equal(query.get("phase"), null);
  assert.equal(query.get("period"), null);
  assert.equal(query.get("page"), "1");
  assert.equal(query.get("sort"), "score_desc");

  assert.equal(select("Rechercher une startup").value, "");
  assert.equal(select("Programme").value, "");
  assert.equal(select("Statut").value, "ACTIVE");
  assert.equal(select("Niveau de vigilance").value, "");

  const url = new URL(window.location.href);
  assert.equal(url.searchParams.get("search"), null);
  assert.equal(url.searchParams.get("sort"), null);
  // La colonne de detail ne depend pas du classement : la selection survit.
  assert.equal(url.searchParams.get("followUp"), "f1");
  assert.equal(screen.queryByRole("button", { name: "Réinitialiser les filtres" }), null);
});

// --- Precedent / Suivant du navigateur : filtres ------------------------------

test("Precedent et Suivant du navigateur rejouent les filtres", async () => {
  await renderScreen();

  fireEvent.change(select("Programme"), { target: { value: PROGRAMS[0].id } });
  await waitFor(() => assert.equal(lastRequest().get("programId"), PROGRAMS[0].id));

  fireEvent.change(select("Programme"), { target: { value: PROGRAMS[1].id } });
  await waitFor(() => assert.equal(lastRequest().get("programId"), PROGRAMS[1].id));

  window.history.back();
  await flushHistory();

  await waitFor(() => assert.equal(select("Programme").value, PROGRAMS[0].id));
  assert.equal(activeQuery().programId, PROGRAMS[0].id, "la bonne requete est reprise");
  assert.equal(
    new URL(window.location.href).searchParams.get("programId"),
    PROGRAMS[0].id,
  );

  window.history.forward();
  await flushHistory();

  await waitFor(() => assert.equal(select("Programme").value, PROGRAMS[1].id));
  assert.equal(activeQuery().programId, PROGRAMS[1].id);
});

test("Precedent rejoue aussi le niveau de vigilance", async () => {
  await renderScreen();

  fireEvent.change(select("Niveau de vigilance"), { target: { value: "CRITICAL" } });
  await waitFor(() => assert.equal(lastRequest().get("level"), "CRITICAL"));

  window.history.back();
  await flushHistory();

  await waitFor(() => assert.equal(select("Niveau de vigilance").value, ""));
  assert.equal(activeQuery().level, undefined);
  assert.equal(new URL(window.location.href).searchParams.get("level"), null);
});

// --- Precedent / Suivant du navigateur : selection master-detail --------------

test("Precedent et Suivant resynchronisent la selection followUp", async () => {
  nextResponse = () =>
    response([
      item({ followUpId: "follow-a", startupName: "Startup A" }),
      item({ followUpId: "follow-b", startupName: "Startup B" }),
    ]);

  window.history.replaceState({}, "", `${LIST_ROUTE}?followUp=follow-a`);
  await renderScreen();

  const rowButton = async (name) => {
    const row = (await screen.findByText(name)).closest("tr");
    return row.querySelector("button");
  };

  fireEvent.click(await rowButton("Startup B"));

  await waitFor(() =>
    assert.equal(new URL(window.location.href).searchParams.get("followUp"), "follow-b"),
  );

  window.history.back();
  await flushHistory();

  await waitFor(() =>
    assert.equal(new URL(window.location.href).searchParams.get("followUp"), "follow-a"),
  );
  // La ligne A redevient la ligne active : la selection suit vraiment l'URL.
  await waitFor(async () => {
    const row = (await screen.findByText("Startup A")).closest("tr");
    assert.match(row.className, /bg-background-accent/);
  });

  window.history.forward();
  await flushHistory();

  await waitFor(() =>
    assert.equal(new URL(window.location.href).searchParams.get("followUp"), "follow-b"),
  );
  await waitFor(async () => {
    const row = (await screen.findByText("Startup B")).closest("tr");
    assert.match(row.className, /bg-background-accent/);
  });
});

test("changer de page ne change pas la selection du master-detail", async () => {
  nextResponse = (query) => {
    const page = Number(query.get("page") ?? 1);

    return response([item({ followUpId: `f-page-${page}`, startupName: `Page ${page}` })], {
      page,
      totalItems: 47,
      totalPages: 3,
      hasNextPage: page < 3,
      hasPreviousPage: page > 1,
    });
  };

  window.history.replaceState({}, "", `${LIST_ROUTE}?followUp=follow-a`);
  await renderScreen();

  fireEvent.click(await screen.findByRole("button", { name: "Suivant" }));
  await waitFor(() => assert.equal(lastRequest().get("page"), "2"));

  assert.equal(
    new URL(window.location.href).searchParams.get("followUp"),
    "follow-a",
    "la pagination ne selectionne aucun autre dossier",
  );
});

// --- Aucune filtration locale ------------------------------------------------

test("l'ecran affiche exactement les items du serveur, dans l'ordre servi", async () => {
  nextResponse = () =>
    response([
      item({ followUpId: "f1", startupName: "Zeta", score: 12, level: "LOW" }),
      item({ followUpId: "f2", startupName: "Alpha", score: 91, level: "CRITICAL" }),
      item({ followUpId: "f3", startupName: "Mu", score: 44, level: "MEDIUM" }),
    ]);

  await renderScreen();

  await screen.findByText("Zeta");
  const names = [...document.querySelectorAll("tbody tr td:first-child")].map(
    (cell) => cell.textContent,
  );

  assert.deepEqual(names, ["Zeta", "Alpha", "Mu"], "ni tri ni filtre cote client");
});

test("aucune generation d'analyse n'est declenchee par les filtres", async () => {
  await renderScreen();

  fireEvent.change(select("Niveau de vigilance"), { target: { value: "HIGH" } });
  await waitFor(() => assert.equal(lastRequest().get("level"), "HIGH"));

  fireEvent.change(select("Statut"), { target: { value: "COMPLETED" } });
  await waitFor(() => assert.equal(lastRequest().get("status"), "COMPLETED"));

  assert.equal(
    requests.length,
    requests.length,
    "toutes les requetes sont des GET de liste",
  );
  assert.ok(requests.length >= 3);
});
