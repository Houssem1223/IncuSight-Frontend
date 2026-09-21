import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, beforeEach, test } from "node:test";

/**
 * Regles d'affichage de l'analyse IA des evaluations.
 *
 * Ce fichier couvre les regles pures
 * de `src/lib/ai-analysis-view.ts` qui pilotent le rendu, plus les appels reseau
 * du client `src/lib/ai-analysis-api.ts` avec un `fetch` simule — meme approche
 * que `tests/business-rules.test.mjs` et `tests/api-refresh.test.mjs`.
 * Le rendu React et les courses du cache sont testes dans les fichiers
 * `ai-analysis-render.test.mjs` et `ai-analysis-cache.test.mjs`.
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

const { ApiError } = await import("../src/lib/api.ts");
const {
  buildAiAnalysisPath,
  generateApplicationAiAnalysis,
  getApplicationAiAnalysis,
  refreshApplicationAiAnalysis,
} = await import("../src/lib/ai-analysis-api.ts");
const {
  ADVISORY_NOTICE,
  AI_UNAVAILABLE_MESSAGE,
  GENERATION_IN_PROGRESS_MESSAGE,
  INSUFFICIENT_EVALUATIONS_MESSAGE,
  NO_SUBMITTED_EVALUATIONS_MESSAGE,
  canGenerateAnalysis,
  formatGeneratedAt,
  formatMean,
  formatScoreRange,
  getAiAnalysisErrorMessage,
  getBusyMessage,
  getCriterionLabel,
  getDetailedDivergences,
  getDivergenceNotice,
  getPrimaryActionLabel,
  getSeverityLabel,
  getSeverityTone,
  getSummarySections,
  isReadyAnalysis,
  needsDetailCard,
} = await import("../src/lib/ai-analysis-view.ts");

after(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

// --- Fixtures ---------------------------------------------------------------
// Formes recopiees du contrat backend (`IncuSight-Backend/docs/AI_ANALYSIS.md`).
// Echelle 1-5 : aucune note ne peut valoir 8.

function divergence(overrides) {
  return {
    criterion: "innovation",
    mean: 4,
    min: 4,
    max: 4,
    range: 0,
    standardDeviation: 0,
    normalizedDivergence: 0,
    severity: "LOW",
    explanation: null,
    keyDifferences: [],
    ...overrides,
  };
}

const READY_ANALYSIS = {
  applicationId: "app-1",
  status: "READY",
  summary: {
    executiveSummary: "Equipe experimentee, traction a documenter.",
    mainStrengths: ["Experience de l'equipe", "Produit deja en production"],
    mainWeaknesses: ["Traction commerciale faible"],
    pointsToClarify: ["Preciser les donnees de traction"],
  },
  divergences: [
    divergence({ criterion: "innovation", mean: 4.5, min: 4, max: 5, range: 1 }),
    divergence({
      criterion: "market",
      mean: 3,
      min: 1,
      max: 5,
      range: 4,
      standardDeviation: 2,
      normalizedDivergence: 0.5,
      severity: "HIGH",
      explanation: "Les evaluateurs divergent sur la taille du marche adressable.",
      keyDifferences: ["Marche de niche pour l'un", "Marche europeen pour l'autre"],
    }),
    divergence({
      criterion: "team",
      mean: 3.5,
      min: 3,
      max: 4,
      range: 1,
      standardDeviation: 0.5,
      normalizedDivergence: 0.125,
    }),
    divergence({
      criterion: "feasibility",
      mean: 3,
      min: 2,
      max: 4,
      range: 2,
      standardDeviation: 1,
      normalizedDivergence: 0.25,
      severity: "MEDIUM",
      explanation: "Le calendrier technique n'est pas lu de la meme facon.",
      keyDifferences: ["Delai juge tenable", "Delai juge optimiste"],
    }),
    divergence({ criterion: "fit", mean: 4, min: 4, max: 4 }),
  ],
  meta: {
    advisoryOnly: true,
    submittedEvaluations: 2,
    generatedAt: "2026-09-17T12:30:00.000Z",
    provider: "ollama",
    model: "modele-configure",
    explanationProvider: "ollama",
    explanationModel: "modele-configure",
    fromCache: false,
    divergenceStatus: "DETECTED",
    message: null,
  },
};

const SINGLE_EVALUATION_ANALYSIS = {
  ...READY_ANALYSIS,
  divergences: [],
  meta: {
    ...READY_ANALYSIS.meta,
    submittedEvaluations: 1,
    divergenceStatus: "INSUFFICIENT_EVALUATIONS",
    message: "Au moins deux evaluations soumises sont necessaires pour calculer une divergence.",
  },
};

const NOT_GENERATED_ANALYSIS = {
  applicationId: "app-1",
  status: "NOT_GENERATED",
  analysis: null,
  message: "Aucune analyse IA n'a encore ete generee.",
};

const STALE_ANALYSIS = {
  applicationId: "app-1",
  status: "STALE",
  analysis: null,
  message: "L'analyse doit etre regeneree.",
};

// --- 1. Aucune analyse generee ---------------------------------------------

test("sans analyse, la section propose de la generer", () => {
  assert.equal(isReadyAnalysis(NOT_GENERATED_ANALYSIS), false);
  assert.equal(isReadyAnalysis(undefined), false);
  assert.equal(getPrimaryActionLabel(NOT_GENERATED_ANALYSIS), "Générer l’analyse");
  assert.equal(getPrimaryActionLabel(undefined), "Générer l’analyse");
});

test("une analyse perimee s'actualise au lieu de se generer", () => {
  // STALE : un resultat existe en base, mais il ne porte plus sur les avis
  // actuels. Le backend refuse de le servir ; l'action reste une actualisation.
  assert.equal(isReadyAnalysis(STALE_ANALYSIS), false);
  assert.equal(getPrimaryActionLabel(STALE_ANALYSIS), "Actualiser l’analyse");
});

// --- 2. Affichage d'une analyse --------------------------------------------

test("une analyse prete est reconnue et ne propose aucune regeneration", () => {
  assert.equal(isReadyAnalysis(READY_ANALYSIS), true);
  assert.equal(getPrimaryActionLabel(READY_ANALYSIS), null);
});

test("la date de generation est formatee, une date absente ou invalide ne casse rien", () => {
  const formatted = formatGeneratedAt(READY_ANALYSIS.meta.generatedAt);

  assert.match(formatted, /17\/09\/2026/);
  assert.equal(formatGeneratedAt(null), "-");
  assert.equal(formatGeneratedAt(""), "-");
  assert.equal(formatGeneratedAt("pas-une-date"), "-");
});

test("les moyennes restent sur l'echelle 1-5 du backend", () => {
  assert.equal(formatMean(4.5), "4,5 / 5");
  assert.equal(formatMean(3), "3,0 / 5");
  assert.equal(
    formatScoreRange(READY_ANALYSIS.divergences[1]),
    "Min 1 · Max 5",
  );
});

// --- 3, 4, 5. Forces, faiblesses, points a clarifier ------------------------

test("la synthese expose forces, points de vigilance et points a clarifier", () => {
  const sections = getSummarySections(READY_ANALYSIS.summary);

  assert.deepEqual(
    sections.map((section) => section.key),
    ["strengths", "weaknesses", "clarify"],
  );
  assert.deepEqual(
    sections.map((section) => section.title),
    ["Points forts", "Points de vigilance", "Points à clarifier"],
  );
  assert.deepEqual(sections[0].items, [
    "Experience de l'equipe",
    "Produit deja en production",
  ]);
  assert.deepEqual(sections[1].items, ["Traction commerciale faible"]);
  assert.deepEqual(sections[2].items, ["Preciser les donnees de traction"]);
});

test("une liste vide est annoncee, jamais masquee en silence", () => {
  // Sinon l'admin ne peut pas distinguer « l'IA n'a rien retenu » d'un bug
  // d'affichage.
  const sections = getSummarySections({
    executiveSummary: "Texte.",
    mainStrengths: [],
    mainWeaknesses: [],
    pointsToClarify: [],
  });

  for (const section of sections) {
    assert.deepEqual(section.items, []);
    assert.ok(section.emptyMessage.length > 0);
  }
});

test("chaque liste porte un marqueur textuel, pas seulement une couleur", () => {
  const markers = getSummarySections(READY_ANALYSIS.summary).map(
    (section) => section.marker,
  );

  assert.deepEqual(markers, ["✓", "•", "?"]);
});

// --- 6, 7, 8. Mapping des severites ----------------------------------------

test("LOW s'affiche comme une faible divergence", () => {
  assert.equal(getSeverityLabel("LOW"), "Faible divergence");
  assert.equal(getSeverityTone("LOW"), "neutral");
  assert.equal(needsDetailCard(divergence({ severity: "LOW" })), false);
});

test("MEDIUM s'affiche comme une divergence moderee", () => {
  assert.equal(getSeverityLabel("MEDIUM"), "Divergence modérée");
  assert.equal(getSeverityTone("MEDIUM"), "warning");
  assert.equal(needsDetailCard(divergence({ severity: "MEDIUM" })), true);
});

test("HIGH s'affiche comme une forte divergence", () => {
  assert.equal(getSeverityLabel("HIGH"), "Forte divergence");
  assert.equal(getSeverityTone("HIGH"), "danger");
  assert.equal(needsDetailCard(divergence({ severity: "HIGH" })), true);
});

test("les criteres backend ont un libelle francais, un critere inconnu reste lisible", () => {
  assert.equal(getCriterionLabel("innovation"), "Innovation");
  assert.equal(getCriterionLabel("market"), "Marché");
  assert.equal(getCriterionLabel("team"), "Équipe");
  assert.equal(getCriterionLabel("feasibility"), "Faisabilité");
  assert.equal(getCriterionLabel("fit"), "Adéquation");
  assert.equal(getCriterionLabel("nouveau_critere"), "nouveau_critere");
});

// --- 9. Explication d'une forte divergence ---------------------------------

test("seules MEDIUM et HIGH sont detaillees, la plus forte en premier", () => {
  const detailed = getDetailedDivergences(READY_ANALYSIS.divergences);

  assert.deepEqual(
    detailed.map((item) => item.criterion),
    ["market", "feasibility"],
  );
  assert.equal(detailed[0].severity, "HIGH");
  assert.equal(
    detailed[0].explanation,
    "Les evaluateurs divergent sur la taille du marche adressable.",
  );
  assert.deepEqual(detailed[0].keyDifferences, [
    "Marche de niche pour l'un",
    "Marche europeen pour l'autre",
  ]);
});

test("le tri des divergences ne modifie pas le tableau du backend", () => {
  const original = READY_ANALYSIS.divergences.map((item) => item.criterion);
  getDetailedDivergences(READY_ANALYSIS.divergences);

  assert.deepEqual(
    READY_ANALYSIS.divergences.map((item) => item.criterion),
    original,
  );
});

test("a severite egale, la divergence normalisee du backend departage", () => {
  const detailed = getDetailedDivergences([
    divergence({ criterion: "team", severity: "HIGH", normalizedDivergence: 0.36 }),
    divergence({ criterion: "market", severity: "HIGH", normalizedDivergence: 0.5 }),
  ]);

  assert.deepEqual(
    detailed.map((item) => item.criterion),
    ["market", "team"],
  );
});

// --- 10. Une seule evaluation ----------------------------------------------

test("avec une seule evaluation, la synthese reste mais les divergences sont annoncees indisponibles", () => {
  assert.equal(isReadyAnalysis(SINGLE_EVALUATION_ANALYSIS), true);
  assert.deepEqual(SINGLE_EVALUATION_ANALYSIS.divergences, []);
  assert.equal(
    getDivergenceNotice(SINGLE_EVALUATION_ANALYSIS),
    INSUFFICIENT_EVALUATIONS_MESSAGE,
  );
  assert.equal(
    INSUFFICIENT_EVALUATIONS_MESSAGE,
    "La détection des divergences nécessite au moins deux évaluations soumises.",
  );
});

test("un consensus general est annonce, une divergence detectee n'affiche aucun avis", () => {
  assert.equal(
    getDivergenceNotice({
      ...READY_ANALYSIS,
      meta: { ...READY_ANALYSIS.meta, divergenceStatus: "NO_SIGNIFICANT_DIVERGENCE" },
    }),
    "Les évaluateurs convergent sur l’ensemble des critères.",
  );
  assert.equal(getDivergenceNotice(READY_ANALYSIS), null);
});

// --- 11. L'action appelle bien le backend ----------------------------------

let fetchCalls = [];

beforeEach(() => {
  fetchCalls = [];
  storage.clear();
  storage.setItem("token", "jeton-admin");
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), method: options.method ?? "GET", signal: options.signal });

    return new Response(JSON.stringify(READY_ANALYSIS), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
});

test("les 3 routes consommees sont celles du module ai, scopees admin", () => {
  assert.equal(
    buildAiAnalysisPath("app-1"),
    "admin/applications/app-1/ai-analysis",
  );
  // Un identifiant exotique ne doit pas pouvoir sortir du chemin.
  assert.equal(
    buildAiAnalysisPath("a/b?x=1"),
    "admin/applications/a%2Fb%3Fx%3D1/ai-analysis",
  );
});

test("generer l'analyse envoie un POST sur la route de generation", async () => {
  const analysis = await generateApplicationAiAnalysis("app-1");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].method, "POST");
  assert.equal(
    new URL(fetchCalls[0].url).pathname,
    "/admin/applications/app-1/ai-analysis",
  );
  assert.equal(analysis.status, "READY");
});

test("actualiser l'analyse cible la route refresh", async () => {
  await refreshApplicationAiAnalysis("app-1");

  assert.equal(fetchCalls[0].method, "POST");
  assert.equal(
    new URL(fetchCalls[0].url).pathname,
    "/admin/applications/app-1/ai-analysis/refresh",
  );
});

test("la lecture est un GET, qui ne declenche jamais d'appel au modele", async () => {
  await getApplicationAiAnalysis("app-1");

  assert.equal(fetchCalls[0].method, "GET");
  assert.equal(
    new URL(fetchCalls[0].url).pathname,
    "/admin/applications/app-1/ai-analysis",
  );
});

test("la lecture transmet le signal d'annulation jusqu'au fetch", async () => {
  const controller = new AbortController();
  await getApplicationAiAnalysis("app-1", controller.signal);
  assert.equal(fetchCalls[0].signal, controller.signal);
});

// --- 12. Etat de chargement -------------------------------------------------

test("le message d'attente distingue generation et simple chargement", () => {
  assert.equal(
    getBusyMessage({ isLoading: false, isGenerating: true }),
    GENERATION_IN_PROGRESS_MESSAGE,
  );
  assert.equal(GENERATION_IN_PROGRESS_MESSAGE, "Analyse des évaluations en cours…");
  assert.equal(
    getBusyMessage({ isLoading: true, isGenerating: false }),
    "Chargement de l’analyse…",
  );
  assert.equal(getBusyMessage({ isLoading: false, isGenerating: false }), null);
});

// --- 13. Erreurs propres ----------------------------------------------------

test("une panne de fournisseur IA ne fuit jamais de detail technique", () => {
  const message = getAiAnalysisErrorMessage(
    new ApiError("Le fournisseur IA a refuse la requete.", 502, {
      code: "AI_PROVIDER_REQUEST_FAILED",
      provider: "groq",
      upstreamStatus: 401,
    }),
  );

  assert.equal(message, AI_UNAVAILABLE_MESSAGE);
  assert.doesNotMatch(message, /groq|mistral|ollama|401|provider/i);
});

test("chaque code metier du module ai a un message lisible", () => {
  const cases = [
    ["AI_NO_SUBMITTED_EVALUATIONS", 400, NO_SUBMITTED_EVALUATIONS_MESSAGE],
    ["AI_INPUT_CHANGED", 409, "Les évaluations ont changé pendant l’analyse. Relancez la génération."],
    ["AI_UNAVAILABLE", 503, AI_UNAVAILABLE_MESSAGE],
    ["AI_CONFIGURATION_ERROR", 503, AI_UNAVAILABLE_MESSAGE],
    [
      "AI_RATE_LIMITED",
      503,
      "L’analyse intelligente est momentanément saturée. Réessayez dans quelques minutes.",
    ],
  ];

  for (const [code, status, expected] of cases) {
    assert.equal(
      getAiAnalysisErrorMessage(new ApiError("message technique", status, { code })),
      expected,
      `code ${code}`,
    );
  }
});

test("une erreur sans code, une erreur reseau ou un objet quelconque restent presentables", () => {
  assert.equal(
    getAiAnalysisErrorMessage(new ApiError("Boom", 500, null)),
    AI_UNAVAILABLE_MESSAGE,
  );
  assert.equal(getAiAnalysisErrorMessage(new TypeError("Failed to fetch")), AI_UNAVAILABLE_MESSAGE);
  assert.equal(getAiAnalysisErrorMessage(undefined), AI_UNAVAILABLE_MESSAGE);
  assert.equal(
    getAiAnalysisErrorMessage(new ApiError("Interdit", 403, {})),
    "Seul un administrateur peut consulter l’analyse IA.",
  );
  assert.equal(
    getAiAnalysisErrorMessage(new ApiError("Introuvable", 404, {})),
    "Cette candidature est introuvable.",
  );
});

// --- 4 bis. Aucune evaluation soumise ---------------------------------------

test("sans evaluation soumise l'action est desactivee, une information inconnue ne la bloque pas", () => {
  assert.equal(canGenerateAnalysis(0), false);
  assert.equal(canGenerateAnalysis(1), true);
  assert.equal(canGenerateAnalysis(2), true);
  // Tant que la synthese n'est pas chargee, c'est le backend qui tranche.
  assert.equal(canGenerateAnalysis(null), true);
  assert.equal(
    NO_SUBMITTED_EVALUATIONS_MESSAGE,
    "L’analyse IA sera disponible lorsqu’au moins une évaluation aura été soumise.",
  );
});

// --- 14. Reserve a l'espace admin ------------------------------------------

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

test("le composant d'analyse IA n'est monte que dans un ecran admin protege", async () => {
  const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
  const files = await collectSourceFiles(sourceRoot);
  const importers = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");

    if (source.includes("ApplicationAiAnalysisCard") && !file.endsWith("ApplicationAiAnalysisCard.tsx")) {
      importers.push(file.slice(sourceRoot.length + 1).replace(/\\/g, "/"));
    }
  }

  assert.deepEqual(importers, ["components/dashboard/admin/AdminApplicationEvaluationsManagement.tsx"]);

  const screen = await readFile(
    `${sourceRoot}/components/dashboard/admin/AdminApplicationEvaluationsManagement.tsx`,
    "utf8",
  );

  assert.match(screen, /<RoleGuard allowedRole="ADMIN">/);
});

// --- 11 bis. Aucune decision automatique ------------------------------------

test("la section IA ne propose aucune action de decision", async () => {
  const component = await readFile(
    fileURLToPath(
      new URL(
        "../src/components/dashboard/admin/evaluations/ApplicationAiAnalysisCard.tsx",
        import.meta.url,
      ),
    ),
    "utf8",
  );

  // Aucun raccourci « accepter/rejeter selon l'IA » ne doit apparaitre : la
  // decision vit sur un autre ecran et reste humaine.
  assert.doesNotMatch(component, /Accepter selon|Rejeter selon|Appliquer la recommandation/i);
  assert.ok(ADVISORY_NOTICE.includes("MEDIANET"));
  assert.ok(component.includes("ADVISORY_NOTICE"));
});
