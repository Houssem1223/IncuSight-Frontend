import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StartupVigilanceOverview from "../src/components/dashboard/admin/vigilance/StartupVigilanceOverview.tsx";
import StartupVigilancePanel from "../src/components/dashboard/admin/vigilance/StartupVigilancePanel.tsx";
import { ApiError } from "../src/lib/api.ts";
import {
  startupVigilanceDetailKey,
  startupVigilanceListKey,
} from "../src/lib/startup-vigilance-query.ts";
import {
  DEFAULT_VIGILANCE_LIST_PARAMS,
  VIGILANCE_LIST_PAGE_SIZE,
  VIGILANCE_TOP_LIMIT,
  toVigilanceListQuery,
} from "../src/lib/startup-vigilance-params.ts";

/**
 * Rendu serveur des ecrans de vigilance, avec un vrai `QueryClient` prerempli —
 * meme harnais que `ai-analysis-render.test.mjs`.
 */

const FACTORS = {
  overdueObjectives: { score: 18, maxScore: 30, applicable: true, dataSufficient: true, count: 2, ratio: 0.6, eligibleCount: 3 },
  blockedObjectives: { score: 15, maxScore: 25, applicable: true, dataSufficient: true, count: 1, ratio: 0.25, eligibleCount: 4 },
  inactivity: { score: 10, maxScore: 20, applicable: true, dataSufficient: true, daysSinceLastUpdate: 17, basis: "LAST_UPDATE" },
  progress: { score: 10, maxScore: 15, applicable: true, dataSufficient: true, averageProgress: 34, source: "OBJECTIVES", excludedRecentObjectives: 0 },
  stagnation: { score: 5, maxScore: 10, applicable: true, dataSufficient: true, recentDelta: 2, measurements: 3 },
};

/** Ordre servi par le backend : `score_desc`, decide globalement puis decoupe. */
const LIST = [
  { followUpId: "f1", startupId: "s1", startupName: "SmartHealth", programId: "p1", programName: "HealthTech 2026", status: "ACTIVE", phase: "BUILD", progress: 34, score: 68, level: "HIGH", factors: FACTORS },
  // `progress` vaut `factors.progress.averageProgress` : les deux vont ensemble,
  // et un facteur non mesurable ne laisse aucune valeur a afficher.
  { followUpId: "f3", startupId: "s3", startupName: "FinPay", programId: "p2", programName: "FinTech 2026", status: "ACTIVE", phase: "MARKET_VALIDATION", progress: null, score: 46, level: "MEDIUM", factors: { ...FACTORS, progress: { score: 0, maxScore: 15, applicable: false, dataSufficient: false, averageProgress: null, source: "INSUFFICIENT", excludedRecentObjectives: 0 } } },
  { followUpId: "f2", startupId: "s2", startupName: "Alpha AI", programId: "p1", programName: "HealthTech 2026", status: "ACTIVE", phase: "BUILD", progress: 74, score: 18, level: "LOW", factors: FACTORS },
];

const PROGRAMS = [
  { id: "p1", title: "HealthTech 2026" },
  { id: "p2", title: "FinTech 2026" },
];

function pagination(overrides = {}) {
  return {
    page: 1,
    limit: VIGILANCE_LIST_PAGE_SIZE,
    totalItems: LIST.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  };
}

/**
 * Precharge la page que le composant va reellement demander.
 *
 * La cle est construite avec `toVigilanceListQuery`, comme dans le composant :
 * si celui-ci demandait d'autres parametres — une autre limite, un autre tri —
 * il ne trouverait rien en cache et le rendu serait vide.
 */
function seedList(client, { items = LIST, params = DEFAULT_VIGILANCE_LIST_PARAMS, limit = VIGILANCE_LIST_PAGE_SIZE, ...rest } = {}) {
  client.setQueryData(startupVigilanceListKey(toVigilanceListQuery(params, limit)), {
    items,
    pagination: pagination({ limit, totalItems: items.length, ...rest }),
  });
}

const AI_ANALYSIS = {
  summary: "La startup progresse sur son produit mais rencontre des difficultes commerciales.",
  mainIssues: [
    {
      category: "SALES",
      title: "Acquisition commerciale",
      description: "Difficultes persistantes a convertir la prospection en rendez-vous.",
      recurrence: "HIGH",
      severity: "HIGH",
      evidenceRefs: ["U2"],
    },
  ],
  positiveSignals: [{ description: "MVP finalise", evidenceRefs: ["U1"] }],
  attentionPoints: ["Validation commerciale"],
  suggestedActions: [
    {
      action: "Organiser une session de mentoring commercial B2B.",
      reason: "Les difficultes de prospection apparaissent dans plusieurs mises a jour.",
      priority: "HIGH",
      evidenceRefs: ["O1"],
    },
  ],
};

function detail(overrides = {}) {
  // Le detail ne porte ni `programId` ni `programName` : ils n'existent que sur
  // la liste (`StartupVigilanceListItemDto`).
  const base = { ...LIST[0] };
  delete base.programId;
  delete base.programName;

  return {
    ...base,
    aiAnalysis: null,
    evidenceSources: [],
    ai: { status: "NOT_GENERATED", fromCache: false, provider: null, model: null, generatedAt: null, message: null, errorCode: null },
    meta: { advisoryOnly: true, scoredAt: "2026-09-18T12:00:00.000Z", coverage: { updateLimit: 5, omittedObjectives: 0, textTruncated: false } },
    ...overrides,
  };
}

const FOLLOW_UP = {
  id: "f1",
  applicationId: "a1",
  startupId: "s1",
  programId: "p1",
  updates: [
    { id: "update-1", followUpId: "f1", authorId: "u1", done: "MVP finalise", createdAt: "2026-09-10T09:00:00.000Z" },
    {
      id: "update-2",
      followUpId: "f1",
      authorId: "u1",
      done: "Prospection demarree",
      blockers: "Difficulte a identifier les decideurs.",
      createdAt: "2026-09-15T09:00:00.000Z",
    },
  ],
  objectives: [{ id: "objective-1", followUpId: "f1", title: "Signer 3 pilotes" }],
};

function clientFor(t) {
  // Garder l'etat prepare pour ce rendu serveur, sans nouvelle tentative au montage.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity } },
  });
  t.after(() => client.clear());
  return client;
}

function renderOverview(client, props = {}) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(StartupVigilanceOverview, {
        // Les deux ecrans de liste passent leurs parametres et un gestionnaire ;
        // le rendu serveur n'execute aucun effet, la fonction ne sert qu'a
        // monter les controles.
        onParamsChange: () => {},
        onReset: () => {},
        params: DEFAULT_VIGILANCE_LIST_PARAMS,
        programs: PROGRAMS,
        ...props,
      }),
    ),
  );
}

function renderPanel(client, followUp = FOLLOW_UP) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(StartupVigilancePanel, { followUpId: "f1", followUp }),
    ),
  );
}

// --- 1, 2, 3 a 6, 7. Liste ---------------------------------------------------

test("la liste affiche chaque startup avec son score, son programme et son niveau traduit", (t) => {
  const client = clientFor(t);
  seedList(client);
  const html = renderOverview(client);

  for (const text of ["SmartHealth", "Alpha AI", "FinPay", "68 / 100", "18 / 100", "46 / 100"]) {
    assert.ok(html.includes(text), text);
  }
  // Le niveau est toujours ecrit, jamais porte par la seule couleur.
  for (const label of ["Élevée", "Faible", "Modérée"]) {
    assert.ok(html.includes(label), label);
  }
  // `programName` vient du backend et s'affiche tel quel.
  assert.ok(html.includes("HealthTech 2026"));
  assert.ok(html.includes("FinTech 2026"));
  // L'ordre servi par le serveur est conserve : rien n'est retrie ici.
  assert.ok(html.indexOf("SmartHealth") < html.indexOf("FinPay"));
  assert.ok(html.indexOf("FinPay") < html.indexOf("Alpha AI"));
});

test("l'ordre servi est conserve tel quel, meme en tri croissant", (t) => {
  const client = clientFor(t);
  const params = { ...DEFAULT_VIGILANCE_LIST_PARAMS, sort: "score_asc" };
  seedList(client, { items: [...LIST].reverse(), params });

  const html = renderOverview(client, { params });

  assert.ok(html.indexOf("Alpha AI") < html.indexOf("FinPay"));
  assert.ok(html.indexOf("FinPay") < html.indexOf("SmartHealth"));
});

test("une progression non mesurable est annoncee, jamais affichee comme 0 %", (t) => {
  const client = clientFor(t);
  seedList(client);
  const html = renderOverview(client);

  assert.match(html, /Progression non disponible/);
  assert.ok(html.includes("34 %"));
});

test("les sept filtres sont etiquetes, et la liste mene au suivi", (t) => {
  const client = clientFor(t);
  seedList(client);
  const html = renderOverview(client);

  // Chaque champ a un <label> lie : utilisable au clavier et au lecteur d'ecran.
  for (const [id, label] of [
    ["search", "Rechercher une startup"],
    ["program", "Programme"],
    ["status", "Statut"],
    ["phase", "Phase"],
    ["level", "Niveau de vigilance"],
    ["period", "Période de démarrage"],
    ["sort", "Trier par"],
  ]) {
    assert.match(html, new RegExp(`for="vigilance-filter-${id}"[^>]*>${label}<`), label);
  }

  assert.ok(html.includes("Tous les programmes"));
  assert.ok(html.includes("Toutes les phases"));
  assert.ok(html.includes("Tous les niveaux"));
  assert.ok(html.includes("Toutes les périodes"));
  assert.ok(html.includes("Vigilance décroissante"));
  // Le statut n'a pas de « tous » : le backend ne sait pas repondre aux quatre.
  assert.ok(!html.includes("Tous les statuts"));
  for (const label of ["Actif", "Terminé", "Suspendu", "Abandonné"]) {
    assert.ok(html.includes(label), label);
  }

  // Les programmes viennent de la source Program, pas des lignes du classement.
  assert.match(html, /<option value="p2">FinTech 2026<\/option>/);

  assert.match(html, /href="\/dashboard\/admin\/incubation-followups\?followUp=f1"/);
  assert.ok(html.includes("Voir le suivi"));
});

test("l'indicateur et le bouton de reset n'apparaissent qu'avec un filtre actif", (t) => {
  const client = clientFor(t);
  seedList(client);

  const neutral = renderOverview(client);
  assert.ok(neutral.includes("Filtres"), "l'entete existe toujours");
  assert.ok(!neutral.includes("Filtres (") , "aucun compteur sans filtre");
  assert.ok(!neutral.includes("Réinitialiser les filtres"));

  const params = {
    ...DEFAULT_VIGILANCE_LIST_PARAMS,
    programId: "p2",
    level: "HIGH",
    search: "Fin",
  };
  seedList(client, { params });
  const filtered = renderOverview(client, { params });

  assert.ok(filtered.includes("Filtres (3)"));
  assert.ok(filtered.includes("Réinitialiser les filtres"));
});

test("le programme selectionne est celui des parametres, jamais un filtre local", (t) => {
  const client = clientFor(t);
  const params = { ...DEFAULT_VIGILANCE_LIST_PARAMS, programId: "p2" };
  // Le backend a deja filtre : la page ne contient que le programme demande.
  seedList(client, { items: [LIST[1]], params });

  const html = renderOverview(client, { params });

  assert.match(html, /<select[^>]*id="vigilance-filter-program"[^>]*value="p2"|value="p2"[^>]*selected/);
  assert.ok(html.includes("FinPay"));
  assert.ok(!html.includes("SmartHealth"), "aucune ligne d'un autre programme");
});

// --- Pagination : tout vient de l'enveloppe du serveur ------------------------

test("la pagination lit l'enveloppe du serveur, jamais items.length", (t) => {
  const client = clientFor(t);
  seedList(client, { totalItems: 47, totalPages: 3, hasNextPage: true });

  const html = renderOverview(client);

  assert.match(html, /Page 1 sur 3/);
  assert.match(html, /47 suivis/, "le total est celui du serveur, pas 3");
  assert.match(html, /aria-label="Pagination de la vigilance des startups"/);
});

test("en page 1, Precedent est reellement desactive et Suivant actif", (t) => {
  const client = clientFor(t);
  seedList(client, { totalItems: 47, totalPages: 3, hasNextPage: true });

  const html = renderOverview(client);
  const previous = html.slice(html.indexOf("<nav"));

  assert.match(previous, /<button[^>]*disabled=""[^>]*>Précédent</);
  assert.doesNotMatch(previous, /<button[^>]*disabled=""[^>]*>Suivant</);
});

test("en page intermediaire, les deux boutons sont actifs", (t) => {
  const client = clientFor(t);
  const params = { ...DEFAULT_VIGILANCE_LIST_PARAMS, page: 2 };
  seedList(client, {
    params,
    page: 2,
    totalItems: 47,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });

  const html = renderOverview(client, { params });
  const nav = html.slice(html.indexOf("<nav"));

  assert.match(html, /Page 2 sur 3/);
  assert.doesNotMatch(nav, /disabled=""/);
});

test("en derniere page, Suivant est desactive", (t) => {
  const client = clientFor(t);
  const params = { ...DEFAULT_VIGILANCE_LIST_PARAMS, page: 3 };
  seedList(client, {
    params,
    page: 3,
    totalItems: 47,
    totalPages: 3,
    hasNextPage: false,
    hasPreviousPage: true,
  });

  const nav = renderOverview(client, { params });

  assert.match(nav, /Page 3 sur 3/);
  assert.match(nav.slice(nav.indexOf("<nav")), /<button[^>]*disabled=""[^>]*>Suivant</);
});

// --- 9. Etats vides ----------------------------------------------------------

test("sans suivi actif, l'etat vide est explicite", (t) => {
  const client = clientFor(t);
  seedList(client, { items: [], totalPages: 0 });

  const html = renderOverview(client);

  assert.match(html, /Aucune startup n’est actuellement en suivi d’incubation/);
  assert.doesNotMatch(html, /<nav/, "pas de pagination sur un classement vide");
});

test("un programme sans suivi a son propre etat vide", (t) => {
  const client = clientFor(t);
  const params = { ...DEFAULT_VIGILANCE_LIST_PARAMS, programId: "p2" };
  seedList(client, { items: [], params, totalPages: 0 });

  const html = renderOverview(client, { params });

  assert.match(html, /Aucune startup en suivi d’incubation pour ce programme/);
  assert.doesNotMatch(html, /Aucune startup n’est actuellement/);
});

// --- 10. Erreur API ----------------------------------------------------------

test("une liste en erreur affiche une alerte et un reessai, jamais un faux vide", async (t) => {
  const client = clientFor(t);
  await client
    .fetchQuery({
      queryKey: startupVigilanceListKey(
        toVigilanceListQuery(DEFAULT_VIGILANCE_LIST_PARAMS, VIGILANCE_LIST_PAGE_SIZE),
      ),
      queryFn: async () => {
        throw new ApiError("failure", 500, null);
      },
    })
    .catch(() => {});

  const html = renderOverview(client);
  assert.match(html, /role="alert"/);
  assert.match(html, /Impossible de charger la liste de vigilance/);
  assert.match(html, /Réessayer le chargement/);
  assert.doesNotMatch(html, /Aucune startup n’est actuellement/);
  assert.doesNotMatch(html, /failure/, "aucune trace technique");
});

// --- Apercu du dashboard -----------------------------------------------------

function seedTop(client, overrides = {}) {
  seedList(client, { limit: VIGILANCE_TOP_LIMIT, ...overrides });
}

test("l'apercu du dashboard demande cinq lignes, page 1, tri decroissant", (t) => {
  const client = clientFor(t);
  // Precharge sous la cle exacte de l'apercu : page 1, limite 5, score_desc.
  seedTop(client);

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.ok(html.includes("Startups nécessitant une attention"));
  assert.ok(html.includes("SmartHealth"), "les donnees de l'apercu sont rendues");
  assert.ok(html.includes("68 / 100"));
});

test("l'apercu n'affiche que cinq lignes au maximum", (t) => {
  const client = clientFor(t);
  const items = Array.from({ length: 5 }, (_, index) => ({
    ...LIST[0],
    followUpId: `top-${index}`,
    startupName: `Startup ${index}`,
    score: 90 - index,
  }));
  seedTop(client, { items });

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });
  const rows = html.match(/<tr class="border-t/g) ?? [];

  assert.equal(rows.length, 5);
  assert.equal(rows.length, VIGILANCE_TOP_LIMIT);
});

test("l'apercu mene au bon suivi et vers la liste complete sans parametres", (t) => {
  const client = clientFor(t);
  seedTop(client);

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.match(html, /href="\/dashboard\/admin\/incubation-followups\?followUp=f1"/);
  assert.match(html, /href="\/dashboard\/admin\/incubation-followups"[^>]*>Voir tous les suivis/);
  assert.doesNotMatch(html, /incubation-followups\?page=|limit=5/);
});

test("l'apercu n'affiche ni filtre ni pagination", (t) => {
  const client = clientFor(t);
  seedTop(client, { totalItems: 47, totalPages: 10, hasNextPage: true });

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.doesNotMatch(html, /vigilance-filter-program/);
  assert.doesNotMatch(html, /<nav/);
  assert.doesNotMatch(html, /Page 1 sur/);
});

test("cinq scores faibles ne sont pas presentes comme une alerte", (t) => {
  const client = clientFor(t);
  const items = LIST.map((item) => ({ ...item, level: "LOW", score: 12 }));
  seedTop(client, { items });

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.match(html, /Aucune startup ne présente actuellement un niveau de vigilance élevé/);
  assert.match(html, /role="status"/);
  // Les scores restent affiches : on ne masque pas la donnee.
  assert.ok(html.includes("12 / 100"));
});

test("l'apercu en erreur a sa propre formulation", async (t) => {
  const client = clientFor(t);
  await client
    .fetchQuery({
      queryKey: startupVigilanceListKey(
        toVigilanceListQuery(DEFAULT_VIGILANCE_LIST_PARAMS, VIGILANCE_TOP_LIMIT),
      ),
      queryFn: async () => {
        throw new ApiError("failure", 500, null);
      },
    })
    .catch(() => {});

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.match(html, /Impossible de charger les indicateurs de vigilance/);
  assert.doesNotMatch(html, /Impossible de charger la liste/);
});

test("l'apercu vide le dit sans alarmer", (t) => {
  const client = clientFor(t);
  seedTop(client, { items: [], totalPages: 0 });

  const html = renderOverview(client, { onParamsChange: undefined, variant: "top" });

  assert.match(html, /Aucune startup n’est actuellement en suivi d’incubation/);
});

// --- Contrat : enveloppe, jamais tableau brut --------------------------------

test("un tableau brut en cache ne rend plus aucune ligne", (t) => {
  const client = clientFor(t);
  // L'ancien contrat : `GET admin/startup-vigilance` renvoyait le tableau.
  client.setQueryData(
    startupVigilanceListKey(
      toVigilanceListQuery(DEFAULT_VIGILANCE_LIST_PARAMS, VIGILANCE_LIST_PAGE_SIZE),
    ),
    LIST,
  );

  const html = renderOverview(client);

  assert.ok(!html.includes("SmartHealth"), "le composant lit response.items");
  assert.doesNotMatch(html, /Page 1 sur/, "et response.pagination");
});

// --- 11 a 17. Detail : score et facteurs -------------------------------------

test("le detail affiche le score, son niveau et la mise en garde", (t) => {
  const client = clientFor(t);
  client.setQueryData(startupVigilanceDetailKey("f1"), detail());
  const html = renderPanel(client);

  assert.ok(html.includes("68 / 100"));
  assert.ok(html.includes("Vigilance &amp; accompagnement"));
  assert.ok(html.includes("Vigilance élevée"));
  assert.match(html, /ne constitue pas une prédiction de réussite ou d’échec/);
});

test("les cinq facteurs sont affiches avec leur donnee metier", (t) => {
  const client = clientFor(t);
  client.setQueryData(startupVigilanceDetailKey("f1"), detail());
  const html = renderPanel(client);

  for (const label of [
    "Objectifs en retard",
    "Objectifs bloqués",
    "Inactivité",
    "Progression",
    "Stagnation",
  ]) {
    assert.ok(html.includes(label), label);
  }

  for (const value of ["18 / 30", "15 / 25", "10 / 20", "10 / 15", "5 / 10"]) {
    assert.ok(html.includes(value), value);
  }

  assert.ok(html.includes("2 objectifs concernés"));
  assert.ok(html.includes("1 objectif bloqué"));
  assert.ok(html.includes("il y a 17 jours"));
  assert.ok(html.includes("+2 points"));
});

test("une stagnation non mesurable le dit au lieu d'afficher un zero rassurant", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      factors: {
        ...FACTORS,
        stagnation: { score: 0, maxScore: 10, applicable: true, dataSufficient: false, recentDelta: null, measurements: 1 },
      },
    }),
  );

  const html = renderPanel(client);
  assert.match(html, /Données insuffisantes pour mesurer la tendance récente/);
  assert.ok(html.includes("0 / 10"));
});

// --- 18, 19. Aucune analyse IA -----------------------------------------------

test("sans analyse IA, le score reste visible et la generation est proposee", (t) => {
  const client = clientFor(t);
  client.setQueryData(startupVigilanceDetailKey("f1"), detail());
  const html = renderPanel(client);

  assert.match(html, /Aucune analyse intelligente n’a encore été générée/);
  assert.match(html, /<button[^>]*>Générer l’analyse<\/button>/);
  assert.ok(html.includes("68 / 100"), "le score reste affiche");
});

// --- 21 a 25. Analyse affichee ------------------------------------------------

test("une analyse prete affiche synthese, problemes, signaux, points et actions", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      aiAnalysis: AI_ANALYSIS,
      evidenceSources: [
        { ref: "U1", kind: "UPDATE", id: "update-1" },
        { ref: "U2", kind: "UPDATE", id: "update-2" },
        { ref: "O1", kind: "OBJECTIVE", id: "objective-1" },
      ],
      ai: { status: "READY", fromCache: true, provider: "ollama", model: "modele", generatedAt: "2026-09-18T10:00:00.000Z", message: null, errorCode: null },
    }),
  );

  const html = renderPanel(client);

  assert.ok(html.includes("Analyse intelligente du suivi"));
  assert.ok(html.includes("difficultes commerciales"));
  assert.ok(html.includes("Acquisition commerciale"));
  assert.ok(html.includes("Commercial"), "la categorie SALES est traduite");
  assert.ok(html.includes("Récurrence élevée"));
  assert.ok(html.includes("Vigilance élevée"));
  assert.ok(html.includes("MVP finalise"), "signal positif");
  assert.ok(html.includes("Validation commerciale"), "point a examiner");
  assert.ok(html.includes("Organiser une session de mentoring"), "action suggeree");
  assert.ok(html.includes("Priorité élevée"));
  assert.ok(html.includes("Analyse générée le"));

  // Detail technique du fournisseur : jamais expose a l'utilisateur metier.
  assert.doesNotMatch(html, /ollama|modele/i);
});

test("les sources sont nommees, jamais reduites a leurs references brutes", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      aiAnalysis: AI_ANALYSIS,
      evidenceSources: [
        { ref: "U1", kind: "UPDATE", id: "update-1" },
        { ref: "U2", kind: "UPDATE", id: "update-2" },
        { ref: "O1", kind: "OBJECTIVE", id: "objective-1" },
      ],
      ai: { status: "READY", fromCache: true, provider: null, model: null, generatedAt: "2026-09-18T10:00:00.000Z", message: null, errorCode: null },
    }),
  );

  const html = renderPanel(client);

  assert.ok(html.includes("Mise à jour du 15/09/2026"));
  assert.ok(html.includes("Objectif « Signer 3 pilotes »"));
  // Le contenu de la source est consultable sans quitter la page.
  assert.ok(html.includes("Difficulte a identifier les decideurs."));
  assert.doesNotMatch(html, />U2</);
});

test("sans suivi charge, les sources retombent sur un decompte, sans rien inventer", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      aiAnalysis: AI_ANALYSIS,
      evidenceSources: [],
      ai: { status: "READY", fromCache: true, provider: null, model: null, generatedAt: "2026-09-18T10:00:00.000Z", message: null, errorCode: null },
    }),
  );

  const html = renderPanel(client, null);

  assert.ok(html.includes("Basé sur 1 élément du suivi."));
  assert.doesNotMatch(html, />U2</);
});

// --- 26. IA indisponible -----------------------------------------------------

test("l'IA indisponible laisse le score et les facteurs entierement visibles", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      ai: { status: "UNAVAILABLE", fromCache: false, provider: null, model: null, generatedAt: null, message: "Analyse IA indisponible ; le score déterministe reste disponible.", errorCode: "VIGILANCE_AI_UNAVAILABLE" },
    }),
  );

  const html = renderPanel(client);

  assert.match(html, /L’analyse intelligente est temporairement indisponible/);
  assert.match(html, /Le score de vigilance reste calculé normalement/);
  assert.ok(html.includes("68 / 100"), "le score reste affiche");
  assert.ok(html.includes("Objectifs en retard"), "les facteurs restent affiches");
  assert.doesNotMatch(html, /role="alert"/, "ce n'est pas une erreur de requete");
});

// --- 27. Actualisation -------------------------------------------------------

test("une analyse perimee propose l'actualisation sans ecran blanc", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({ aiAnalysis: AI_ANALYSIS, ai: { ...detail().ai, status: "STALE" } }),
  );

  const html = renderPanel(client);

  assert.match(html, /<button[^>]*>Actualiser l’analyse<\/button>/);
  assert.match(html, /Le suivi a évolué depuis la dernière analyse/);
  assert.ok(html.includes("68 / 100"), "le score reste affiche");
});

test("un suivi sans point d'avancement ne propose pas de bouton trompeur", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({ ai: { ...detail().ai, status: "INSUFFICIENT_DATA" } }),
  );

  const html = renderPanel(client);

  assert.match(html, /nécessite au moins un point d’avancement/);
  assert.doesNotMatch(html, /Générer l’analyse|Actualiser l’analyse/);
  assert.ok(html.includes("68 / 100"));
});

// --- 33. Erreur sur le detail ------------------------------------------------

test("un suivi introuvable affiche un message metier, pas une erreur technique", async (t) => {
  const client = clientFor(t);
  await client
    .fetchQuery({
      queryKey: startupVigilanceDetailKey("f1"),
      queryFn: async () => {
        throw new ApiError("Follow-up not found", 404, null);
      },
    })
    .catch(() => {});

  const html = renderPanel(client);
  assert.match(html, /Ce suivi d’incubation est introuvable/);
  assert.doesNotMatch(html, /Follow-up not found/);
});

// --- 24, 37. Aucune action automatique ---------------------------------------

test("aucune action suggeree n'est applicable en un clic", (t) => {
  const client = clientFor(t);
  client.setQueryData(
    startupVigilanceDetailKey("f1"),
    detail({
      aiAnalysis: AI_ANALYSIS,
      evidenceSources: [{ ref: "O1", kind: "OBJECTIVE", id: "objective-1" }],
      ai: { status: "READY", fromCache: true, provider: null, model: null, generatedAt: "2026-09-18T10:00:00.000Z", message: null, errorCode: null },
    }),
  );

  const html = renderPanel(client);

  assert.doesNotMatch(html, /Appliquer|Créer l’objectif|Planifier/i);
  assert.match(html, /constituent une aide à l’accompagnement/);
  assert.ok(html.includes("MEDIANET"));
});
