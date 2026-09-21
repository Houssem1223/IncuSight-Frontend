import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { hashKey } from "@tanstack/react-query";

/**
 * Liste de vigilance : parametres envoyes au backend, cles de cache, transitions
 * d'etat et lecture de l'enveloppe paginee.
 *
 * Meme harnais `fetch` simule que `startup-vigilance.test.mjs`. Le rendu est
 * couvert par `startup-vigilance-render.test.mjs`.
 */

process.env.NEXT_PUBLIC_API_URL = "http://127.0.0.1:8050";

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  clear() {
    this.items.clear();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  removeItem(key) {
    this.items.delete(key);
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }
}

if (typeof globalThis.CustomEvent === "undefined") {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, init = {}) {
      super(type);
      this.detail = init.detail;
    }
  };
}

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const storage = new MemoryStorage();

globalThis.window = new EventTarget();
globalThis.localStorage = storage;

const {
  buildStartupVigilanceListPath,
  buildStartupVigilanceListQuery,
  getStartupVigilanceList,
} = await import("../src/lib/startup-vigilance-api.ts");
const {
  DEFAULT_VIGILANCE_LIST_PARAMS,
  DEFAULT_VIGILANCE_PAGE,
  DEFAULT_VIGILANCE_SORT,
  VIGILANCE_LIST_PAGE_SIZE,
  VIGILANCE_TOP_LIMIT,
  applyVigilanceListParamChange,
  countActiveVigilanceFilters,
  getOutOfRangeVigilancePage,
  hasNonDefaultVigilanceParams,
  parseVigilanceListParams,
  parseVigilanceSort,
  resetVigilanceListParams,
  toVigilanceListQuery,
  toVigilanceTopParams,
  writeVigilanceListParams,
} = await import("../src/lib/startup-vigilance-params.ts");
const { startupVigilanceListKey, startupVigilanceListRootKey } = await import(
  "../src/lib/startup-vigilance-query.ts"
);
const {
  NO_FOLLOW_UPS_FOR_PROGRAM_MESSAGE,
  NO_FOLLOW_UPS_MESSAGE,
  NO_VIGILANCE_MATCH_MESSAGE,
  VIGILANCE_LIST_ERROR_MESSAGE,
  VIGILANCE_SORT_OPTIONS,
  VIGILANCE_TOP_ERROR_MESSAGE,
  formatVigilancePageStatus,
  formatVigilanceTotal,
  getVigilanceEmptyMessage,
  getVigilanceListErrorMessage,
  getVigilanceRepresentativeProgress,
  hasElevatedVigilance,
} = await import("../src/lib/startup-vigilance-view.ts");
const { ApiError } = await import("../src/lib/api.ts");

after(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

// --- Fixtures ----------------------------------------------------------------

const FACTORS = {
  overdueObjectives: { score: 0, maxScore: 30, applicable: true, dataSufficient: true, count: 0, ratio: 0, eligibleCount: 1 },
  blockedObjectives: { score: 0, maxScore: 25, applicable: true, dataSufficient: true, count: 0, ratio: 0, eligibleCount: 1 },
  inactivity: { score: 0, maxScore: 20, applicable: true, dataSufficient: true, daysSinceLastUpdate: 1, basis: "LAST_UPDATE" },
  progress: { score: 0, maxScore: 15, applicable: true, dataSufficient: true, averageProgress: 85, source: "OBJECTIVES", excludedRecentObjectives: 0 },
  stagnation: { score: 0, maxScore: 10, applicable: true, dataSufficient: true, recentDelta: 20, measurements: 2 },
};

function item(overrides = {}) {
  return {
    followUpId: "f1",
    startupId: "s1",
    startupName: "Startup exemple",
    programId: "p1",
    programName: "Programme A",
    status: "ACTIVE",
    phase: "BUILD",
    progress: 85,
    score: 0,
    level: "LOW",
    factors: FACTORS,
    ...overrides,
  };
}

const LIST_RESPONSE = {
  items: [item(), item({ followUpId: "f2", startupName: "FinPay", score: 74, level: "HIGH" })],
  pagination: {
    page: 1,
    limit: 20,
    totalItems: 47,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

let fetchCalls = [];

beforeEach(() => {
  fetchCalls = [];
  storage.clear();
  storage.setItem("token", "jeton-admin");
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), method: options.method ?? "GET" });

    return new Response(JSON.stringify(LIST_RESPONSE), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
});

function lastQuery() {
  return new URL(fetchCalls.at(-1).url).searchParams;
}

// --- 37. Client API : parametres transmis ------------------------------------

test("sans parametre, aucune cle n'est envoyee : le backend applique ses defauts", async () => {
  await getStartupVigilanceList();

  const url = new URL(fetchCalls[0].url);
  assert.equal(url.pathname, "/admin/startup-vigilance");
  assert.equal(url.search, "", "page, limit et sort restent decides par le serveur");
  assert.equal(buildStartupVigilanceListQuery(), "");
  assert.equal(buildStartupVigilanceListPath(), "admin/startup-vigilance");
});

test("programId, page, limit et sort partent tels quels dans la query string", async () => {
  await getStartupVigilanceList({
    programId: "prog_123",
    page: 2,
    limit: VIGILANCE_LIST_PAGE_SIZE,
    sort: "score_asc",
  });

  const query = lastQuery();
  assert.equal(query.get("programId"), "prog_123");
  assert.equal(query.get("page"), "2");
  assert.equal(query.get("limit"), "20");
  assert.equal(query.get("sort"), "score_asc");
});

test("chaque parametre est transmis isolement, sans entrainer les autres", () => {
  const cases = [
    [{ search: "health" }, "search=health"],
    [{ programId: "p1" }, "programId=p1"],
    [{ status: "COMPLETED" }, "status=COMPLETED"],
    [{ phase: "MARKET_VALIDATION" }, "phase=MARKET_VALIDATION"],
    [{ level: "CRITICAL" }, "level=CRITICAL"],
    [{ period: "3m" }, "period=3m"],
    [{ from: "2026-09-01" }, "from=2026-09-01"],
    [{ page: 4 }, "page=4"],
    [{ limit: VIGILANCE_TOP_LIMIT }, "limit=5"],
    [{ sort: "score_desc" }, "sort=score_desc"],
  ];

  for (const [params, expected] of cases) {
    assert.equal(buildStartupVigilanceListQuery(params), expected, JSON.stringify(params));
  }

  // Le ValidationPipe backend est en `forbidNonWhitelisted` et rejette les
  // valeurs vides (`status=''` -> 400) : une valeur vide devient une cle absente.
  assert.equal(buildStartupVigilanceListQuery({ programId: "", status: "", period: "" }), "");
  assert.equal(buildStartupVigilanceListQuery({ search: "   " }), "", "une recherche blanche ne filtre rien");
  assert.equal(buildStartupVigilanceListQuery({ search: "  health  " }), "search=health");
});

test("les sept filtres partent ensemble, dans une seule query string", async () => {
  await getStartupVigilanceList({
    search: "health",
    programId: "prog_123",
    status: "SUSPENDED",
    phase: "BUILD",
    level: "HIGH",
    period: "custom",
    from: "2026-09-01",
    to: "2026-09-30",
    page: 2,
    limit: 20,
    sort: "score_asc",
  });

  const query = lastQuery();
  assert.deepEqual(
    [...query.keys()].sort(),
    ["from", "level", "limit", "page", "period", "phase", "programId", "search", "sort", "status", "to"],
    "exactement les cles du DTO backend, ni plus ni moins",
  );
  assert.equal(query.get("level"), "HIGH");
  assert.equal(query.get("phase"), "BUILD");
  assert.equal(query.get("period"), "custom");
});

test("toVigilanceListQuery n'envoie jamais period=custom sans ses deux bornes", () => {
  const incomplete = toVigilanceListQuery({
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    period: "custom",
    from: "2026-09-01",
  });

  // `period=custom` sans `to` est un 400 cote backend : mieux vaut ne pas
  // restreindre la periode que casser l'ecran pendant la saisie.
  assert.equal(incomplete.period, undefined);
  assert.equal(incomplete.from, undefined);
  assert.equal(incomplete.to, undefined);

  const complete = toVigilanceListQuery({
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    period: "custom",
    from: "2026-09-01",
    to: "2026-09-30",
  });

  assert.equal(complete.period, "custom");
  assert.equal(complete.from, "2026-09-01");
  assert.equal(complete.to, "2026-09-30");

  // Un preset n'emporte jamais de bornes, meme si l'etat en garde.
  const preset = toVigilanceListQuery({
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    period: "30d",
    from: "2026-09-01",
    to: "2026-09-30",
  });
  assert.equal(preset.from, undefined);
});

test("l'apercu du dashboard ne reprend que les filtres globaux compatibles", () => {
  const params = toVigilanceTopParams({
    programId: "p1",
    period: "custom",
    from: "2026-09-01",
    to: "2026-09-30",
    // Statut de *candidature* : aucun rapport avec IncubationStatus, et le
    // transmettre serait un 400. Il ne doit pas traverser.
    status: "ACCEPTED",
  });

  assert.equal(params.programId, "p1");
  assert.equal(params.period, "custom");
  assert.equal(params.from, "2026-09-01");
  assert.equal(params.status, "ACTIVE", "le statut d'incubation reste au defaut");
  assert.equal(params.page, 1);
  assert.equal(params.sort, "score_desc");

  const query = toVigilanceListQuery(params, VIGILANCE_TOP_LIMIT);
  assert.equal(query.limit, 5);
  assert.ok(!Object.values(query).includes("ACCEPTED"), "aucun statut de candidature");
});

test("l'apercu du dashboard demande page 1, limite 5, score_desc", async () => {
  await getStartupVigilanceList(
    toVigilanceListQuery(DEFAULT_VIGILANCE_LIST_PARAMS, VIGILANCE_TOP_LIMIT),
  );

  const query = lastQuery();
  assert.equal(query.get("page"), "1");
  assert.equal(query.get("limit"), "5");
  assert.equal(query.get("sort"), "score_desc");
  assert.equal(query.get("programId"), null);
  assert.equal(fetchCalls.length, 1, "aucun appel supplementaire depuis l'apercu");
});

test("aucun appel d'analyse n'est declenche par la liste", async () => {
  await getStartupVigilanceList({ page: 1 });
  await getStartupVigilanceList({ page: 2 });

  assert.deepEqual(
    fetchCalls.map((call) => call.method),
    ["GET", "GET"],
  );
  assert.ok(
    fetchCalls.every((call) => !/\/(analyze|refresh)/.test(call.url)),
    "ni analyze ni refresh depuis le classement",
  );
});

// --- 37. Client API : lecture de l'enveloppe ---------------------------------

test("la reponse est lue comme une enveloppe items + pagination", async () => {
  const response = await getStartupVigilanceList({ page: 1 });

  assert.ok(Array.isArray(response.items));
  assert.equal(response.items.length, 2);
  assert.equal(response.items[0].startupName, "Startup exemple");
  assert.equal(response.items[0].programName, "Programme A");
  // La progression retenue par le scoring, pas celle du suivi.
  assert.equal(response.items[0].progress, response.items[0].factors.progress.averageProgress);

  assert.deepEqual(response.pagination, {
    page: 1,
    limit: 20,
    totalItems: 47,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  });
  assert.notEqual(
    response.pagination.totalItems,
    response.items.length,
    "le total est celui du serveur, pas celui de la page",
  );
});

// --- 38. Cles de cache --------------------------------------------------------

test("la queryKey porte les onze parametres, sans filtre comme avec", () => {
  const withoutFilter = startupVigilanceListKey(
    toVigilanceListQuery(DEFAULT_VIGILANCE_LIST_PARAMS, VIGILANCE_LIST_PAGE_SIZE),
  );

  assert.deepEqual(withoutFilter, [
    "startup-vigilance",
    "list",
    {
      search: undefined,
      programId: undefined,
      // Le statut part toujours explicitement : c'est le defaut serveur, mais
      // l'ecrire rend la cle non ambigue.
      status: "ACTIVE",
      phase: undefined,
      level: undefined,
      period: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      limit: 20,
      sort: "score_desc",
    },
  ]);

  const withProgram = startupVigilanceListKey({ programId: "p1", page: 1, limit: 20, sort: "score_desc" });
  assert.notEqual(hashKey(withoutFilter), hashKey(withProgram));
});

test("chaque filtre donne son entree de cache : aucune combinaison ne se melange", () => {
  const base = { status: "ACTIVE", page: 1, limit: 20, sort: "score_desc" };
  const keys = [
    base,
    { ...base, page: 2 },
    { ...base, sort: "score_asc" },
    { ...base, programId: "p1" },
    { ...base, programId: "p2" },
    { ...base, limit: VIGILANCE_TOP_LIMIT },
    { ...base, search: "health" },
    { ...base, search: "green" },
    { ...base, status: "COMPLETED" },
    { ...base, phase: "BUILD" },
    { ...base, phase: "CLOSING" },
    { ...base, level: "HIGH" },
    { ...base, level: "CRITICAL" },
    { ...base, period: "7d" },
    { ...base, period: "30d" },
    { ...base, period: "custom", from: "2026-09-01", to: "2026-09-30" },
    { ...base, period: "custom", from: "2026-08-01", to: "2026-09-30" },
    // Les filtres se combinent : une combinaison n'est pas la somme de ses parts.
    { ...base, programId: "p1", level: "HIGH" },
  ].map((params) => hashKey(startupVigilanceListKey(params)));

  assert.equal(new Set(keys).size, keys.length, "aucune collision de cache");
});

test("deux programmes ne se melangent jamais, meme a la meme page", () => {
  const programA = hashKey(startupVigilanceListKey({ programId: "p1", page: 1, limit: 20, sort: "score_desc", status: "ACTIVE" }));
  const programB = hashKey(startupVigilanceListKey({ programId: "p2", page: 1, limit: 20, sort: "score_desc", status: "ACTIVE" }));
  const programBPage2 = hashKey(startupVigilanceListKey({ programId: "p2", page: 2, limit: 20, sort: "score_desc", status: "ACTIVE" }));

  assert.notEqual(programA, programB);
  assert.notEqual(programB, programBPage2);
});

test("une cle absente et une cle undefined designent la meme entree", () => {
  assert.equal(
    hashKey(startupVigilanceListKey({ page: 1, limit: 20, sort: "score_desc" })),
    hashKey(startupVigilanceListKey({ programId: undefined, page: 1, limit: 20, sort: "score_desc" })),
  );
});

test("la cle de liste ne prefixe plus celle des details", () => {
  // `["startup-vigilance"]` etait un prefixe de `["startup-vigilance", id]` :
  // invalider la liste emportait alors tous les details en cache.
  assert.deepEqual([...startupVigilanceListRootKey], ["startup-vigilance", "list"]);
  assert.notEqual(startupVigilanceListRootKey[1], "f1");
});

// --- 14, 16. Transitions : retour a la page 1 --------------------------------

/** Un etat complet, tous filtres poses, pour verifier les transitions. */
function state(overrides = {}) {
  return { ...DEFAULT_VIGILANCE_LIST_PARAMS, page: 4, ...overrides };
}

test("chacun des sept filtres et le tri ramenent a la page 1", () => {
  const changes = [
    { search: "health" },
    { programId: "p2" },
    { status: "COMPLETED" },
    { phase: "BUILD" },
    { level: "HIGH" },
    { period: "7d" },
    { sort: "score_asc" },
  ];

  for (const change of changes) {
    assert.equal(
      applyVigilanceListParamChange(state(), change).page,
      1,
      JSON.stringify(change),
    );
  }
});

test("revenir a la valeur « tous » d'un filtre ramene aussi a la page 1", () => {
  const filtered = state({ programId: "p1", level: "HIGH", phase: "BUILD", search: "x" });

  assert.equal(applyVigilanceListParamChange(filtered, { programId: undefined }).page, 1);
  assert.equal(applyVigilanceListParamChange(filtered, { level: undefined }).page, 1);
  assert.equal(applyVigilanceListParamChange(filtered, { phase: undefined }).page, 1);
  assert.equal(applyVigilanceListParamChange(filtered, { search: "" }).page, 1);
});

test("changer de page ne touche a aucun filtre", () => {
  const current = state({ programId: "p1", level: "HIGH", search: "health", sort: "score_asc", page: 2 });

  assert.deepEqual(applyVigilanceListParamChange(current, { page: 3 }), {
    ...current,
    page: 3,
  });
});

test("rechoisir la valeur deja selectionnee ne reinitialise pas la page", () => {
  const current = state({ programId: "p1", level: "HIGH" });

  assert.equal(applyVigilanceListParamChange(current, { programId: "p1" }).page, 4);
  assert.equal(applyVigilanceListParamChange(current, { level: "HIGH" }).page, 4);
  assert.equal(applyVigilanceListParamChange(current, { sort: "score_desc" }).page, 4);
  assert.equal(applyVigilanceListParamChange(current, { status: "ACTIVE" }).page, 4);
});

test("quitter la periode personnalisee efface ses bornes", () => {
  const custom = state({ period: "custom", from: "2026-09-01", to: "2026-09-30" });
  const preset = applyVigilanceListParamChange(custom, { period: "30d" });

  assert.equal(preset.from, undefined);
  assert.equal(preset.to, undefined);
  // Les bornes restent tant qu'on est en personnalise.
  assert.equal(applyVigilanceListParamChange(custom, { page: 2 }).from, "2026-09-01");
});

test("le reset remet les sept filtres, le tri et la page au defaut", () => {
  const filtered = state({
    search: "health",
    programId: "p1",
    status: "DROPPED",
    phase: "CLOSING",
    level: "CRITICAL",
    period: "custom",
    from: "2026-09-01",
    to: "2026-09-30",
    sort: "score_asc",
  });

  assert.equal(countActiveVigilanceFilters(filtered), 6);
  assert.equal(hasNonDefaultVigilanceParams(filtered), true);

  const reset = resetVigilanceListParams();

  assert.deepEqual(reset, DEFAULT_VIGILANCE_LIST_PARAMS);
  assert.equal(countActiveVigilanceFilters(reset), 0);
  assert.equal(hasNonDefaultVigilanceParams(reset), false);
  assert.equal(reset.status, "ACTIVE", "le statut revient au defaut serveur");
});

test("le tri seul ne compte pas comme un filtre, mais reste non par defaut", () => {
  const sorted = state({ sort: "score_asc", page: 1 });

  assert.equal(countActiveVigilanceFilters(sorted), 0);
  assert.equal(hasNonDefaultVigilanceParams(sorted), true);
});

test("les deux tris du backend sont proposes, dans cet ordre", () => {
  assert.deepEqual(
    VIGILANCE_SORT_OPTIONS.map((option) => option.value),
    ["score_desc", "score_asc"],
  );
  assert.deepEqual(
    VIGILANCE_SORT_OPTIONS.map((option) => option.label),
    ["Vigilance décroissante", "Vigilance croissante"],
  );
  assert.equal(DEFAULT_VIGILANCE_SORT, "score_desc");
  assert.equal(VIGILANCE_LIST_PAGE_SIZE, 20, "meme limite par defaut que le backend");
});

// --- 28. Parametres d'URL ----------------------------------------------------

test("l'URL est relue telle quelle, valeurs aberrantes ramenees aux defauts", () => {
  assert.deepEqual(
    parseVigilanceListParams(
      new URLSearchParams(
        "search=Health&programId=p1&status=SUSPENDED&phase=BUILD&level=HIGH&period=custom&from=2026-09-01&to=2026-09-30&page=2&sort=score_asc",
      ),
    ),
    {
      search: "Health",
      programId: "p1",
      status: "SUSPENDED",
      phase: "BUILD",
      level: "HIGH",
      period: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
      page: 2,
      sort: "score_asc",
    },
  );

  // Une URL bricolee a la main doit afficher la premiere page, pas faire un 400.
  assert.deepEqual(
    parseVigilanceListParams(
      new URLSearchParams("page=zero&sort=alpha&status=ACCEPTED&phase=UNKNOWN&level=high&period=90d"),
    ),
    DEFAULT_VIGILANCE_LIST_PARAMS,
  );
  assert.deepEqual(parseVigilanceListParams(null), DEFAULT_VIGILANCE_LIST_PARAMS);
  assert.equal(parseVigilanceSort("score_asc"), "score_asc");
  assert.equal(parseVigilanceSort(null), "score_desc");
});

test("une recherche trop longue est tronquee plutot que refusee par le backend", () => {
  const parsed = parseVigilanceListParams(
    new URLSearchParams(`search=${"a".repeat(400)}`),
  );

  assert.equal(parsed.search.length, 200, "la limite MaxLength(200) du DTO");
});

test("l'ecriture conserve followUp et retire les valeurs par defaut", () => {
  const current = new URLSearchParams("followUp=abc&page=4&sort=score_asc&programId=p1");

  const written = writeVigilanceListParams(current, {
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    search: "  Health  ",
    programId: "p2",
    status: "COMPLETED",
    phase: "BUILD",
    level: "HIGH",
    period: "7d",
    page: 2,
    sort: "score_asc",
  });

  assert.equal(written.get("followUp"), "abc", "la selection du master-detail survit");
  assert.equal(written.get("search"), "Health", "trime, comme le fera le backend");
  assert.equal(written.get("programId"), "p2");
  assert.equal(written.get("status"), "COMPLETED");
  assert.equal(written.get("phase"), "BUILD");
  assert.equal(written.get("level"), "HIGH");
  assert.equal(written.get("period"), "7d");
  assert.equal(written.get("page"), "2");
  assert.equal(written.get("sort"), "score_asc");

  const defaults = writeVigilanceListParams(current, DEFAULT_VIGILANCE_LIST_PARAMS);
  assert.equal(defaults.get("followUp"), "abc");
  assert.equal(defaults.get("programId"), null);
  assert.equal(defaults.get("status"), null, "ACTIVE est le defaut serveur");
  assert.equal(defaults.get("page"), null, "page 1 n'alourdit pas l'URL");
  assert.equal(defaults.get("sort"), null);
  assert.equal(defaults.toString(), "followUp=abc", "rien d'autre ne subsiste");
});

test("les bornes personnalisees ne sont ecrites que sous period=custom", () => {
  const withRange = writeVigilanceListParams(new URLSearchParams(), {
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    period: "custom",
    from: "2026-09-01",
    to: "2026-09-30",
  });

  assert.equal(withRange.get("from"), "2026-09-01");
  assert.equal(withRange.get("to"), "2026-09-30");

  const preset = writeVigilanceListParams(new URLSearchParams(), {
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    period: "30d",
    from: "2026-09-01",
    to: "2026-09-30",
  });

  assert.equal(preset.get("from"), null, "des bornes invisibles ne trainent pas");
  assert.equal(preset.get("to"), null);
});

// --- 20. Page hors limites ---------------------------------------------------

test("une page au-dela du dernier rang ramene a la page 1, sans boucle", () => {
  const outOfRange = {
    page: 4,
    limit: 20,
    totalItems: 47,
    totalPages: 3,
    hasNextPage: false,
    hasPreviousPage: true,
  };

  assert.equal(getOutOfRangeVigilancePage(outOfRange), DEFAULT_VIGILANCE_PAGE);
  // La page corrigee existe toujours : la correction ne se redeclenche pas.
  assert.equal(getOutOfRangeVigilancePage({ ...outOfRange, page: 1 }), null);
});

test("un classement vide n'est pas une page hors limites", () => {
  assert.equal(
    getOutOfRangeVigilancePage({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    }),
    null,
  );
  assert.equal(getOutOfRangeVigilancePage(undefined), null);
});

// --- 21, 22, 23, 35. Formulations --------------------------------------------

test("le total et la position de page viennent de l'enveloppe", () => {
  assert.equal(formatVigilanceTotal(47), "47 suivis");
  assert.equal(formatVigilanceTotal(1), "1 suivi");
  assert.equal(formatVigilanceTotal(0), "0 suivi");
  assert.equal(formatVigilancePageStatus(LIST_RESPONSE.pagination), "Page 1 sur 3");
  // Le backend renvoie 0 page quand le classement est vide.
  assert.equal(
    formatVigilancePageStatus({ ...LIST_RESPONSE.pagination, page: 1, totalPages: 0 }),
    "Page 1 sur 1",
  );
});

test("l'etat vide dit pourquoi : recherche, programme seul, ou criteres combines", () => {
  const base = DEFAULT_VIGILANCE_LIST_PARAMS;

  assert.equal(getVigilanceEmptyMessage(base), NO_FOLLOW_UPS_MESSAGE);
  assert.equal(
    getVigilanceEmptyMessage({ ...base, programId: "p1" }),
    NO_FOLLOW_UPS_FOR_PROGRAM_MESSAGE,
  );
  assert.equal(
    getVigilanceEmptyMessage({ ...base, programId: "p1", level: "HIGH" }),
    NO_VIGILANCE_MATCH_MESSAGE,
    "deux filtres : le message generaliste",
  );
  assert.equal(
    getVigilanceEmptyMessage({ ...base, search: "  HealthFlow " }),
    "Aucune startup trouvée pour « HealthFlow ».",
    "la recherche prime, et le terme est cite trime",
  );
});

test("les erreurs de liste et d'apercu ont leurs formulations, sans trace technique", () => {
  const failure = new ApiError("connect ECONNREFUSED", 500, { stack: "…" });

  assert.equal(getVigilanceListErrorMessage(failure, "list"), VIGILANCE_LIST_ERROR_MESSAGE);
  assert.equal(getVigilanceListErrorMessage(failure, "top"), VIGILANCE_TOP_ERROR_MESSAGE);
  assert.equal(
    getVigilanceListErrorMessage(new TypeError("Failed to fetch"), "list"),
    VIGILANCE_LIST_ERROR_MESSAGE,
  );
  // Le 403 garde sa phrase metier sur les deux ecrans.
  const forbidden = new ApiError("Forbidden", 403, null);
  assert.equal(
    getVigilanceListErrorMessage(forbidden, "top"),
    getVigilanceListErrorMessage(forbidden, "list"),
  );
  assert.match(getVigilanceListErrorMessage(forbidden, "list"), /administrateur/);
});

// --- 25. Progression retenue par le scoring ----------------------------------

test("la progression affichee est celle que le scoring a retenue", () => {
  assert.equal(getVigilanceRepresentativeProgress(item()), 85);

  // Facteur non applicable : le zero ne se lit pas « aucun probleme ».
  assert.equal(
    getVigilanceRepresentativeProgress(
      item({
        factors: {
          ...FACTORS,
          progress: { ...FACTORS.progress, applicable: false, averageProgress: null, source: "INSUFFICIENT" },
        },
      }),
    ),
    null,
  );

  // Donnees insuffisantes : idem, meme si une valeur trainait.
  assert.equal(
    getVigilanceRepresentativeProgress(
      item({
        factors: {
          ...FACTORS,
          progress: { ...FACTORS.progress, dataSufficient: false, averageProgress: 42 },
        },
      }),
    ),
    null,
  );

  // Tous les objectifs termines : 100 % reste une mesure valide.
  assert.equal(
    getVigilanceRepresentativeProgress(
      item({
        factors: {
          ...FACTORS,
          progress: { ...FACTORS.progress, averageProgress: 100, source: "ALL_DONE" },
        },
      }),
    ),
    100,
  );
});

// --- 10. Apercu sans vigilance elevee ----------------------------------------

test("une page sans niveau eleve ni critique est reconnue comme telle", () => {
  const lowOnly = [item({ level: "LOW" }), item({ followUpId: "f2", level: "MEDIUM" })];

  assert.equal(hasElevatedVigilance(lowOnly), false);
  assert.equal(hasElevatedVigilance([...lowOnly, item({ followUpId: "f3", level: "HIGH" })]), true);
  assert.equal(hasElevatedVigilance([item({ level: "CRITICAL" })]), true);
  assert.equal(hasElevatedVigilance([]), false);
});
