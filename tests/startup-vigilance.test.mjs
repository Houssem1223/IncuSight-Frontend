import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { after, beforeEach, test } from "node:test";

/**
 * Regles d'affichage de la vigilance des startups et client API.
 *
 * Le rendu React est couvert par `startup-vigilance-render.test.mjs` ; ici, les
 * regles pures de `src/lib/startup-vigilance-view.ts` et les routes reellement
 * appelees, avec un `fetch` simule — meme approche que `ai-analysis.test.mjs`.
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
  analyzeStartupVigilance,
  buildStartupVigilancePath,
  getStartupVigilance,
  getStartupVigilanceList,
  refreshStartupVigilanceAnalysis,
} = await import("../src/lib/startup-vigilance-api.ts");
const { VIGILANCE_LIST_PAGE_SIZE } = await import("../src/lib/startup-vigilance-params.ts");
const {
  AI_UNAVAILABLE_MESSAGE,
  NO_AI_ANALYSIS_MESSAGE,
  PROGRESS_UNAVAILABLE_MESSAGE,
  STAGNATION_UNAVAILABLE_MESSAGE,
  formatSignedPoints,
  formatVigilanceProgress,
  formatVigilanceScore,
  getActionPriorityLabel,
  getEvidenceFallbackLabel,
  getEvidenceUpdateFields,
  getIssueSeverityLabel,
  getRecurrenceLabel,
  getVigilanceAiState,
  getVigilanceCategoryLabel,
  getVigilanceErrorMessage,
  getVigilanceFactorRows,
  getVigilanceLevelLabel,
  getVigilanceLevelTone,
  needsForcedRefresh,
  resolveEvidenceRefs,
} = await import("../src/lib/startup-vigilance-view.ts");

after(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

// --- Fixtures ---------------------------------------------------------------
// Formes recopiees du contrat backend (`IncuSight-Backend/docs/STARTUP_VIGILANCE.md`).

const FACTORS = {
  overdueObjectives: {
    score: 18,
    maxScore: 30,
    applicable: true,
    dataSufficient: true,
    count: 2,
    ratio: 0.6,
    eligibleCount: 3,
  },
  blockedObjectives: {
    score: 15,
    maxScore: 25,
    applicable: true,
    dataSufficient: true,
    count: 1,
    ratio: 0.6,
    eligibleCount: 4,
  },
  inactivity: {
    score: 10,
    maxScore: 20,
    applicable: true,
    dataSufficient: true,
    daysSinceLastUpdate: 17,
    basis: "LAST_UPDATE",
  },
  progress: {
    score: 10,
    maxScore: 15,
    applicable: true,
    dataSufficient: true,
    averageProgress: 34,
    source: "OBJECTIVES",
    excludedRecentObjectives: 0,
  },
  stagnation: {
    score: 5,
    maxScore: 10,
    applicable: true,
    dataSufficient: true,
    recentDelta: 2,
    measurements: 3,
  },
};

function listItem(overrides) {
  return {
    followUpId: "f1",
    startupId: "s1",
    startupName: "SmartHealth",
    programId: "p1",
    programName: "HealthTech 2026",
    status: "ACTIVE",
    phase: "BUILD",
    progress: 34,
    score: 68,
    level: "HIGH",
    factors: FACTORS,
    ...overrides,
  };
}

const LIST = [
  listItem({ followUpId: "f1", startupName: "SmartHealth", score: 68, level: "HIGH" }),
  listItem({
    followUpId: "f2",
    startupName: "Alpha AI",
    score: 18,
    level: "LOW",
    progress: 74,
  }),
  listItem({
    followUpId: "f3",
    startupName: "FinPay",
    score: 46,
    level: "MEDIUM",
    phase: "MARKET_VALIDATION",
    progress: 51,
  }),
  listItem({
    followUpId: "f4",
    startupName: "Orbit",
    score: 88,
    level: "CRITICAL",
    progress: null,
  }),
];

const AI_ANALYSIS = {
  summary:
    "La startup progresse sur son produit mais rencontre des difficultes commerciales persistantes.",
  mainIssues: [
    {
      category: "SALES",
      title: "Acquisition commerciale",
      description:
        "Les dernieres mises a jour montrent des difficultes persistantes a convertir la prospection en rendez-vous.",
      recurrence: "HIGH",
      severity: "HIGH",
      evidenceRefs: ["U1", "U2"],
    },
  ],
  positiveSignals: [{ description: "MVP finalise", evidenceRefs: ["U1"] }],
  attentionPoints: ["Validation commerciale", "Ciblage des prospects"],
  suggestedActions: [
    {
      action: "Organiser une session de mentoring commercial B2B.",
      reason: "Les difficultes de prospection apparaissent dans plusieurs mises a jour.",
      priority: "HIGH",
      evidenceRefs: ["U2", "O1"],
    },
  ],
};

function detail(overrides = {}) {
  return {
    ...listItem(),
    aiAnalysis: null,
    evidenceSources: [],
    ai: {
      status: "NOT_GENERATED",
      fromCache: false,
      provider: null,
      model: null,
      generatedAt: null,
      message: "Aucune analyse IA générée.",
      errorCode: null,
    },
    meta: {
      advisoryOnly: true,
      scoredAt: "2026-09-18T12:00:00.000Z",
      coverage: { updateLimit: 5, omittedObjectives: 0, textTruncated: false },
    },
    ...overrides,
  };
}

// --- 1, 2. La liste affiche les startups et leurs scores --------------------

test("chaque ligne porte le score du backend, sans recalcul", () => {
  assert.deepEqual(
    LIST.map((item) => item.score),
    [68, 18, 46, 88],
    "les scores sont repris tels quels, dans l'ordre servi",
  );
  assert.equal(formatVigilanceScore(68), "68 / 100");
  assert.equal(formatVigilanceProgress(34), "34 %");
});

test("une progression indisponible n'est jamais affichee comme 0 %", () => {
  // Le backend renvoie null quand le scoring n'a aucune mesure representative.
  assert.equal(formatVigilanceProgress(null), PROGRESS_UNAVAILABLE_MESSAGE);
  assert.equal(formatVigilanceProgress(0), "0 %");
});

// --- 3, 4, 5, 6. Traduction des niveaux -------------------------------------

test("les quatre niveaux ont un libelle francais et un ton distinct", () => {
  const expected = [
    ["LOW", "Faible", "neutral"],
    ["MEDIUM", "Modérée", "info"],
    ["HIGH", "Élevée", "warning"],
    ["CRITICAL", "Critique", "danger"],
  ];

  for (const [level, label, tone] of expected) {
    assert.equal(getVigilanceLevelLabel(level), label, level);
    assert.equal(getVigilanceLevelTone(level), tone, level);
  }
});

// --- 7. Tri ------------------------------------------------------------------

test("le tri est un parametre serveur, jamais un retri de la page affichee", async () => {
  // Retrier la page apres decoupage donnerait un ordre different de celui qui a
  // decide du decoupage : le tri part au backend, et l'ordre servi est conserve.
  const view = await readFile(
    fileURLToPath(new URL("../src/lib/startup-vigilance-view.ts", import.meta.url)),
    "utf8",
  );

  assert.ok(!/export function sortVigilanceItems/.test(view), "aucun tri client");
  assert.ok(!/export function getVisibleVigilanceItems/.test(view), "aucun tri client");
  assert.match(view, /VIGILANCE_SORT_OPTIONS/);
});

// --- 8. Filtre par niveau ---------------------------------------------------

test("le filtre de niveau est serveur : aucun helper local ne subsiste", async () => {
  // Le backend applique `level` sur le classement complet, avant pagination :
  // `totalItems` en tient compte. Un filtre local ne montrerait que les
  // correspondances de la page et fausserait le total.
  const view = await readFile(
    fileURLToPath(new URL("../src/lib/startup-vigilance-view.ts", import.meta.url)),
    "utf8",
  );

  assert.ok(!/filterVigilanceItems/.test(view), "plus de filtre de niveau local");
  assert.ok(!/VigilanceLevelFilter/.test(view), "plus de type de filtre local");
  assert.match(view, /VIGILANCE_LEVELS/, "les niveaux restent proposes au Select");
});

// --- 12 a 17. Facteurs -------------------------------------------------------

test("les cinq facteurs sont rendus dans l'ordre des poids du backend", () => {
  const rows = getVigilanceFactorRows(FACTORS);

  assert.deepEqual(
    rows.map((row) => row.key),
    ["overdueObjectives", "blockedObjectives", "inactivity", "progress", "stagnation"],
  );
  assert.deepEqual(
    rows.map((row) => `${row.score} / ${row.maxScore}`),
    ["18 / 30", "15 / 25", "10 / 20", "10 / 15", "5 / 10"],
  );
});

test("chaque facteur porte une phrase metier, pas seulement un rapport de points", () => {
  const rows = getVigilanceFactorRows(FACTORS);
  const detailByKey = Object.fromEntries(rows.map((row) => [row.key, row.detail]));

  assert.match(detailByKey.overdueObjectives, /2 objectifs concernés/);
  assert.match(detailByKey.blockedObjectives, /1 objectif bloqué/);
  assert.match(detailByKey.inactivity, /il y a 17 jours/);
  assert.match(detailByKey.progress, /34 %/);
  assert.match(detailByKey.stagnation, /\+2 points/);
});

test("un facteur sans denominateur est annonce, jamais lu comme « aucun probleme »", () => {
  const rows = getVigilanceFactorRows({
    ...FACTORS,
    overdueObjectives: {
      score: 0,
      maxScore: 30,
      applicable: false,
      dataSufficient: false,
      count: 0,
      ratio: 0,
      eligibleCount: 0,
    },
  });
  const row = rows.find((item) => item.key === "overdueObjectives");

  assert.equal(row.detail, "Aucun objectif actif avec échéance.");
  assert.equal(row.measured, false);
});

test("une stagnation non mesurable affiche le manque de donnees, pas un zero", () => {
  const rows = getVigilanceFactorRows({
    ...FACTORS,
    stagnation: {
      score: 0,
      maxScore: 10,
      applicable: true,
      dataSufficient: false,
      recentDelta: null,
      measurements: 1,
    },
  });
  const row = rows.find((item) => item.key === "stagnation");

  assert.equal(row.detail, STAGNATION_UNAVAILABLE_MESSAGE);
  assert.equal(row.measured, false);
  assert.doesNotMatch(row.detail, /aucune stagnation/i);
});

test("une progression indisponible ou integralement atteinte est explicitee", () => {
  const unavailable = getVigilanceFactorRows({
    ...FACTORS,
    progress: {
      score: 0,
      maxScore: 15,
      applicable: false,
      dataSufficient: false,
      averageProgress: null,
      source: "INSUFFICIENT",
      excludedRecentObjectives: 2,
    },
  }).find((row) => row.key === "progress");

  assert.match(unavailable.detail, /Progression non disponible/);

  const allDone = getVigilanceFactorRows({
    ...FACTORS,
    progress: { ...FACTORS.progress, source: "ALL_DONE", averageProgress: 100 },
  }).find((row) => row.key === "progress");

  assert.equal(allDone.detail, "Tous les objectifs sont terminés.");
});

test("le delai de grace du backend est annonce quand il exclut des objectifs", () => {
  const row = getVigilanceFactorRows({
    ...FACTORS,
    progress: { ...FACTORS.progress, excludedRecentObjectives: 2 },
  }).find((item) => item.key === "progress");

  assert.match(row.detail, /2 objectifs récents exclus/);
});

test("une inactivite mesuree depuis la creation du suivi le dit", () => {
  const row = getVigilanceFactorRows({
    ...FACTORS,
    inactivity: { ...FACTORS.inactivity, basis: "FOLLOW_UP_CREATED", daysSinceLastUpdate: 3 },
  }).find((item) => item.key === "inactivity");

  assert.match(row.detail, /Aucun point d’avancement depuis la création du suivi, il y a 3 jours/);
});

test("le signe de la tendance recente est conserve", () => {
  assert.equal(formatSignedPoints(2), "+2 points");
  assert.equal(formatSignedPoints(-3), "-3 points");
  assert.equal(formatSignedPoints(0), "0 point");
  assert.equal(formatSignedPoints(1), "+1 point");
});

// --- 18 a 21, 26, 27. Etats de l'analyse IA ---------------------------------

test("sans analyse, l'etat propose la generation et n'affiche rien d'autre", () => {
  const state = getVigilanceAiState(detail());

  assert.equal(state.showAnalysis, false);
  assert.equal(state.actionLabel, "Générer l’analyse");
  assert.equal(state.notice, NO_AI_ANALYSIS_MESSAGE);
  assert.equal(state.degraded, false);
});

test("une analyse prete s'affiche et peut etre actualisee", () => {
  const state = getVigilanceAiState(
    detail({
      aiAnalysis: AI_ANALYSIS,
      ai: { ...detail().ai, status: "READY", generatedAt: "2026-09-18T10:00:00.000Z" },
    }),
  );

  assert.equal(state.showAnalysis, true);
  assert.equal(state.actionLabel, "Actualiser l’analyse");
  assert.equal(state.notice, null);
  // Seule une analyse encore valide justifie de forcer une regeneration payante.
  assert.equal(needsForcedRefresh("READY"), true);
  assert.equal(needsForcedRefresh("STALE"), false);
  assert.equal(needsForcedRefresh("NOT_GENERATED"), false);
});

test("l'IA indisponible reste un avis, jamais un remplacement de la page", () => {
  const state = getVigilanceAiState(
    detail({
      ai: {
        ...detail().ai,
        status: "UNAVAILABLE",
        errorCode: "VIGILANCE_AI_UNAVAILABLE",
        message: "Analyse IA indisponible ; le score déterministe reste disponible.",
      },
    }),
  );

  assert.equal(state.degraded, true);
  assert.equal(state.notice, AI_UNAVAILABLE_MESSAGE);
  assert.match(state.notice, /score de vigilance reste calculé/);
  assert.equal(state.actionLabel, "Réessayer l’analyse");
});

test("les statuts sans action possible n'affichent pas de bouton trompeur", () => {
  for (const status of ["INSUFFICIENT_DATA", "NOT_APPLICABLE"]) {
    const state = getVigilanceAiState(detail({ ai: { ...detail().ai, status } }));

    assert.equal(state.actionLabel, null, status);
    assert.equal(state.showAnalysis, false, status);
    assert.ok(state.notice.length > 0, status);
  }
});

test("une analyse perimee ou concurrente n'est jamais servie comme a jour", () => {
  const stale = getVigilanceAiState(
    detail({ aiAnalysis: AI_ANALYSIS, ai: { ...detail().ai, status: "STALE" } }),
  );
  assert.equal(stale.showAnalysis, false);
  assert.match(stale.notice, /Le suivi a évolué/);

  const changed = getVigilanceAiState(detail({ ai: { ...detail().ai, status: "INPUT_CHANGED" } }));
  assert.equal(changed.showAnalysis, false);
  assert.equal(changed.actionLabel, "Relancer l’analyse");
});

// --- 22, 23, 24. Contenu de l'analyse ---------------------------------------

test("les categories de probleme sont traduites, une categorie inconnue reste lisible", () => {
  const expected = [
    ["SALES", "Commercial"],
    ["FINANCE", "Financement"],
    ["PRODUCT", "Produit"],
    ["TECHNICAL", "Technique"],
    ["TEAM", "Équipe"],
    ["MARKETING", "Marketing"],
    ["LEGAL", "Juridique"],
    ["OPERATIONS", "Opérations"],
    ["OTHER", "Autre"],
  ];

  for (const [category, label] of expected) {
    assert.equal(getVigilanceCategoryLabel(category), label, category);
  }

  assert.equal(getVigilanceCategoryLabel("NOUVELLE"), "NOUVELLE");
});

test("recurrence, severite et priorite sont trois lectures distinctes", () => {
  assert.equal(getRecurrenceLabel("HIGH"), "Récurrence élevée");
  assert.equal(getIssueSeverityLabel("HIGH"), "Vigilance élevée");
  assert.equal(getActionPriorityLabel("HIGH"), "Priorité élevée");
  assert.equal(getRecurrenceLabel("MEDIUM"), "Récurrence modérée");
  assert.equal(getActionPriorityLabel("LOW"), "Priorité faible");
});

// --- 25. Sources / evidenceRefs ---------------------------------------------

const EVIDENCE_CONTEXT = {
  sources: [
    { ref: "U1", kind: "UPDATE", id: "update-1" },
    { ref: "U2", kind: "UPDATE", id: "update-2" },
    { ref: "O1", kind: "OBJECTIVE", id: "objective-1" },
  ],
  updates: [
    {
      id: "update-1",
      followUpId: "f1",
      authorId: "a1",
      done: "MVP finalise",
      createdAt: "2026-09-10T09:00:00.000Z",
    },
    {
      id: "update-2",
      followUpId: "f1",
      authorId: "a1",
      done: "Prospection demarree",
      blockers: "Difficulte a identifier les decideurs.",
      needs: "Accompagnement commercial.",
      createdAt: "2026-09-15T09:00:00.000Z",
    },
  ],
  objectives: [{ id: "objective-1", followUpId: "f1", title: "Signer 3 pilotes" }],
};

test("les references sont remplacees par des libelles lisibles", () => {
  const { resolved, unresolvedCount } = resolveEvidenceRefs(["U2", "O1"], EVIDENCE_CONTEXT);

  assert.equal(unresolvedCount, 0);
  assert.deepEqual(
    resolved.map((item) => item.label),
    ["Mise à jour du 15/09/2026", "Objectif « Signer 3 pilotes »"],
  );
  // La reference brute ne doit jamais devenir un libelle.
  for (const item of resolved) {
    assert.doesNotMatch(item.label, /^[UO]\d+$/);
  }
});

test("une reference non resolvable est comptee, jamais inventee ni affichee brute", () => {
  const { resolved, unresolvedCount } = resolveEvidenceRefs(
    ["U1", "U9", "O7"],
    EVIDENCE_CONTEXT,
  );

  assert.equal(resolved.length, 1);
  assert.equal(unresolvedCount, 2);
  assert.equal(getEvidenceFallbackLabel(2), "Basé sur 2 éléments du suivi.");
  assert.equal(getEvidenceFallbackLabel(1), "Basé sur 1 élément du suivi.");
});

test("une update citee expose ses champs renseignes, et seulement eux", () => {
  const fields = getEvidenceUpdateFields(EVIDENCE_CONTEXT.updates[1]);

  assert.deepEqual(
    fields.map((field) => field.label),
    ["Réalisé", "Blocages", "Besoins"],
  );
  assert.equal(fields[1].value, "Difficulte a identifier les decideurs.");
  assert.deepEqual(
    getEvidenceUpdateFields(EVIDENCE_CONTEXT.updates[0]).map((field) => field.label),
    ["Réalisé"],
  );
});

// --- 10, 33. Erreurs ---------------------------------------------------------

test("les erreurs de requete sont traduites sans detail technique", () => {
  assert.equal(
    getVigilanceErrorMessage(new ApiError("Follow-up not found", 404, null)),
    "Ce suivi d’incubation est introuvable.",
  );
  assert.equal(
    getVigilanceErrorMessage(new ApiError("Forbidden", 403, null)),
    "Seul un administrateur peut consulter la vigilance des startups.",
  );
  assert.equal(
    getVigilanceErrorMessage(new ApiError("Boom", 500, { stack: "…" })),
    "Impossible de calculer l’indicateur de vigilance.",
  );
  assert.equal(
    getVigilanceErrorMessage(new TypeError("Failed to fetch")),
    "Impossible de calculer l’indicateur de vigilance.",
  );
});

// --- 36, 37. Routes reellement appelees --------------------------------------

let fetchCalls = [];

beforeEach(() => {
  fetchCalls = [];
  storage.clear();
  storage.setItem("token", "jeton-admin");
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url: String(url), method: options.method ?? "GET" });

    return new Response(JSON.stringify(detail()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
});

test("les routes consommees sont celles du module startup-vigilance, scopees admin", () => {
  assert.equal(buildStartupVigilancePath(), "admin/startup-vigilance");
  assert.equal(buildStartupVigilancePath("f1"), "admin/startup-vigilance/f1");
  // Un identifiant exotique ne doit pas pouvoir sortir du chemin.
  assert.equal(
    buildStartupVigilancePath("a/b?x=1"),
    "admin/startup-vigilance/a%2Fb%3Fx%3D1",
  );
});

test("une page du classement tient en une seule requete GET", async () => {
  await getStartupVigilanceList({ page: 1, limit: VIGILANCE_LIST_PAGE_SIZE, sort: "score_desc" });

  assert.equal(fetchCalls.length, 1, "aucun appel par startup");
  assert.equal(fetchCalls[0].method, "GET");
  assert.equal(new URL(fetchCalls[0].url).pathname, "/admin/startup-vigilance");
});

test("la lecture d'un detail est un GET, qui ne genere jamais d'analyse", async () => {
  await getStartupVigilance("f1");

  assert.equal(fetchCalls[0].method, "GET");
  assert.equal(new URL(fetchCalls[0].url).pathname, "/admin/startup-vigilance/f1");
});

test("generer et actualiser ciblent analyze et refresh", async () => {
  await analyzeStartupVigilance("f1");
  await refreshStartupVigilanceAnalysis("f1");

  assert.deepEqual(
    fetchCalls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    [
      "POST /admin/startup-vigilance/f1/analyze",
      "POST /admin/startup-vigilance/f1/refresh",
    ],
  );
});

// --- 28, 29, 30, 35, 37. Invariants de source --------------------------------

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

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));

test("la vigilance n'est montee que dans des ecrans admin proteges par RoleGuard", async () => {
  const files = await collectSourceFiles(sourceRoot);
  const importers = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relative = file.slice(sourceRoot.length + 1).replace(/\\/g, "/");

    if (relative.startsWith("components/dashboard/admin/vigilance/")) {
      continue;
    }

    if (/StartupVigilance(Overview|Panel)/.test(source)) {
      importers.push(relative);
    }
  }

  assert.deepEqual(importers.sort(), [
    "components/dashboard/admin/AdminDashboardOverview.tsx",
    "components/dashboard/admin/incubation-workspace/IncubationWorkspaceContent.tsx",
  ]);

  for (const importer of [importers[0], "components/dashboard/admin/AdminIncubationFollowupsManagement.tsx"]) {
    const source = await readFile(`${sourceRoot}/${importer}`, "utf8");
    assert.match(source, /<RoleGuard allowedRole="ADMIN">/, importer);
  }
});

/**
 * Les commentaires rappellent justement le vocabulaire et les fonctions
 * interdits : seul le code compte pour ces invariants.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** `assert.ok` plutot que `doesNotMatch` : un echec doit nommer le fichier, pas le vomir. */
function assertAbsent(code, pattern, file, reason) {
  assert.ok(!pattern.test(code), `${file} : ${reason}`);
}

test("aucun composant de vigilance ne recalcule un score ni n'applique une suggestion", async () => {
  const files = await collectSourceFiles(`${sourceRoot}/components/dashboard/admin/vigilance`);
  assert.ok(files.length >= 9, "les composants de vigilance doivent exister");

  for (const file of [...files, `${sourceRoot}/lib/startup-vigilance-view.ts`]) {
    const code = stripComments(await readFile(file, "utf8"));

    // Le backend est seul juge du score : aucune arithmetique de scoring ici.
    assertAbsent(
      code,
      /calculate(Vigilance|Stagnation|Overdue|Score)/i,
      file,
      "ne doit pas recalculer le score",
    );
    // Les suggestions restent des suggestions.
    assertAbsent(
      code,
      /Appliquer (automatiquement|la recommandation|cette action)/i,
      file,
      "ne doit proposer aucune application automatique",
    );
  }
});

test("le classement ne refiltre ni ne retrie la page servie par le backend", async () => {
  const overview = await readFile(
    `${sourceRoot}/components/dashboard/admin/vigilance/StartupVigilanceOverview.tsx`,
    "utf8",
  );
  const code = stripComments(overview);

  // Filtrer apres decoupage ne montrerait que les correspondances de la page :
  // programme et tri sont des parametres du GET, pas des operations locales.
  assertAbsent(
    code,
    /items\s*\.\s*(filter|sort)|\.filter\([^)]*programId/,
    "StartupVigilanceOverview.tsx",
    "ne doit ni refiltrer ni retrier la page",
  );
  // L'enveloppe du backend, jamais un tableau brut.
  assert.match(code, /listQuery\.data\?\.items/);
  assert.match(code, /listQuery\.data\?\.pagination/);
});

test("aucune generation d'analyse n'est atteignable depuis le classement", async () => {
  const overview = await readFile(
    `${sourceRoot}/components/dashboard/admin/vigilance/StartupVigilanceOverview.tsx`,
    "utf8",
  );
  const code = stripComments(overview);

  assertAbsent(
    code,
    /analyze|refresh|useAnalyzeStartupVigilance|useRefreshStartupVigilance/i,
    "StartupVigilanceOverview.tsx",
    "l'apercu et la liste ne declenchent jamais le modele",
  );
});

test("le master-detail conserve sa selection et son parametre followUp", async () => {
  const screen = await readFile(
    `${sourceRoot}/components/dashboard/admin/AdminIncubationFollowupsManagement.tsx`,
    "utf8",
  );
  const selection = await readFile(`${sourceRoot}/hooks/useSelectedFollowUp.ts`, "utf8");

  assert.match(selection, /searchParams\.get\("followUp"\)/, "le drill-down reste lu");
  assert.match(screen, /onSelect=\{selectFollowUp\}/);
  assert.match(screen, /<IncubationWorkspaceContent/, "le workspace reste monte");
  const workspace = await readFile(`${sourceRoot}/components/dashboard/admin/incubation-workspace/IncubationWorkspaceContent.tsx`, "utf8");
  assert.match(workspace, /<StartupVigilancePanel/, "le detail reste monte dans son onglet");
  // Le filtre de programme reutilise la source Program existante.
  assert.match(screen, /usePrograms\(\)/);
  assertAbsent(
    stripComments(screen),
    /startup-vigilance\/programs/,
    "AdminIncubationFollowupsManagement.tsx",
    "aucune route de programmes propre a la vigilance",
  );

  // L'URL fait foi : aucun miroir local de `followUp`, sans quoi Precedent et
  // Suivant du navigateur ne resynchroniseraient pas la selection.
  assertAbsent(
    stripComments(screen),
    // Le miroir local s'appelait `selectedFollowUpId` / `setSelectedFollowUpId`.
    // Motif cible : `FollowUpStatus` et `FollowUpObjective` sont d'autres sujets.
    /setSelectedFollowUpId|\[\s*selectedFollowUpId\s*,/,
    "AdminIncubationFollowupsManagement.tsx",
    "la selection ne doit pas etre doublee par un etat local",
  );
  assert.match(selection, /history\.pushState/, "la selection empile une entree d'historique");
});

test("les enums de filtre sont ceux du domaine, jamais une seconde liste", async () => {
  const filters = await readFile(
    `${sourceRoot}/components/dashboard/admin/vigilance/VigilanceFilters.tsx`,
    "utf8",
  );

  // Statuts et phases viennent de `followupHelpers`, comme le reste de l'ecran
  // de suivi : une copie locale finirait par diverger de l'enum Prisma.
  assert.match(filters, /from "\.\.\/followups\/followupHelpers"/);
  assert.match(filters, /followUpStatuses/);
  assert.match(filters, /phases/);
  assertAbsent(
    stripComments(filters),
    /"ONBOARDING"|"SUSPENDED"|"DROPPED"/,
    "VigilanceFilters.tsx",
    "aucune valeur d'enum recopiee a la main",
  );
});

test("le vocabulaire proscrit n'apparait nulle part dans la fonctionnalite", async () => {
  const files = [
    ...(await collectSourceFiles(`${sourceRoot}/components/dashboard/admin/vigilance`)),
    `${sourceRoot}/lib/startup-vigilance-view.ts`,
    `${sourceRoot}/types/startup-vigilance.ts`,
  ];

  for (const file of files) {
    const code = stripComments(await readFile(file, "utf8"));

    assertAbsent(code, /risque d’échec|risque d'échec/i, file, "vocabulaire proscrit");
    assertAbsent(code, /startup (à risque|dangereuse)/i, file, "vocabulaire proscrit");
    assertAbsent(code, /probabilité de (réussite|succès)/i, file, "vocabulaire proscrit");
  }
});
