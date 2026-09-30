/**
 * API NestJS factice pour les recettes visuelles : donnees realistes et
 * volontairement longues (noms, titres, messages) pour faire apparaitre les
 * debordements. Le role est porte par le token : tok-admin, tok-evaluator,
 * tok-startup (avec incubation) et tok-startup-new (sans incubation).
 * Aucune ecriture n'est persistee.
 */
import http from "node:http";

const iso = (days, hour = 10) => new Date(Date.UTC(2026, 8, 30 + days, hour)).toISOString();

export const users = {
  admin: { id: "u-admin", email: "samira.martin@medianet-incubateur.tn", firstName: "Samira", lastName: "Martin", role: "ADMIN", isActive: true, isEmailVerified: true, createdAt: iso(-200) },
  evaluator: { id: "u-eval", email: "karim.bensalah.evaluateur@medianet-incubateur.tn", firstName: "Karim", lastName: "Ben Salah", role: "EVALUATOR", isActive: true, isEmailVerified: true, createdAt: iso(-150) },
  evaluator2: { id: "u-eval2", email: "ines.gharbi@medianet.tn", firstName: "Inès", lastName: "Gharbi", role: "EVALUATOR", isActive: true, isEmailVerified: true, createdAt: iso(-140) },
  evaluator3: { id: "u-eval3", email: "youssef.trabelsi@medianet.tn", firstName: "Youssef", lastName: "Trabelsi", role: "EVALUATOR", isActive: false, isEmailVerified: true, createdAt: iso(-90) },
  startup: { id: "u-startup", email: "leila.haddad.fondatrice@greenloop-solutions.tn", firstName: "Leïla", lastName: "Haddad", role: "STARTUP", isActive: true, isEmailVerified: false, createdAt: iso(-120) },
  startupNew: { id: "u-startup-new", email: "amine.jaziri@novacharge.io", firstName: "Amine", lastName: "Jaziri", role: "STARTUP", isActive: true, isEmailVerified: true, createdAt: iso(-10) },
};
const tokens = { "tok-admin": users.admin, "tok-evaluator": users.evaluator, "tok-startup": users.startup, "tok-startup-new": users.startupNew };

export const programs = [
  { id: "p1", title: "Batch Tech Innovation 2026 — Accélération des startups deeptech et greentech", description: "Programme de six mois pour les startups technologiques en phase d'amorçage : mentorat hebdomadaire, ateliers produit, accès aux experts sectoriels et journée de présentation aux investisseurs partenaires.", openDate: iso(-30), closeDate: iso(45), isOpen: true, createdAt: iso(-60), updatedAt: iso(-5) },
  { id: "p2", title: "Impact Social", description: "Accompagnement des projets à impact social et environnemental.", openDate: iso(-10), closeDate: iso(20), isOpen: true, createdAt: iso(-40), updatedAt: iso(-3) },
  { id: "p3", title: "HealthTech Lab", description: "Programme santé numérique, ouverture prochaine.", openDate: iso(15), closeDate: iso(90), isOpen: false, createdAt: iso(-20), updatedAt: iso(-2) },
  { id: "p4", title: "FinTech Sprint 2025", description: "Programme clôturé.", openDate: iso(-300), closeDate: iso(-200), isOpen: false, createdAt: iso(-320), updatedAt: iso(-200) },
];

const startupBase = (id, name, ownerId, extra = {}) => ({
  id, startupName: name, ownerId, status: "PUBLISHED", sector: "GreenTech / Économie circulaire", stage: "MVP",
  description: `${name} développe une plateforme B2B de collecte, de tri et de revalorisation des emballages industriels, avec traçabilité complète pour les entreprises agroalimentaires de la région.`,
  website: "https://www.greenloop-solutions-mediterranee.tn", linkedinUrl: "https://www.linkedin.com/company/greenloop-solutions-mediterranee",
  pitchDeckOriginalName: "GreenLoop_Solutions_Pitch_Deck_Investisseurs_Septembre_2026_version_finale.pdf", pitchDeckMimeType: "application/pdf", pitchDeckSize: 4_812_331, pitchDeckUploadedAt: iso(-20),
  owner: Object.values(users).find((u) => u.id === ownerId), ...extra,
});
export const startups = [
  startupBase("s1", "GreenLoop Solutions Environnementales Méditerranée", "u-startup"),
  startupBase("s2", "MediSync", "u-startup", { sector: "HealthTech", stage: "Idée", status: "DRAFT", pitchDeckOriginalName: undefined, pitchDeckSize: undefined }),
  startupBase("s3", "AgriSmart", "u-other", { sector: "AgriTech" }),
  startupBase("s4", "NovaCharge", "u-startup-new", { sector: "Mobilité électrique", stage: "Prototype" }),
  startupBase("s5", "EduVerse Academy", "u-other2", { sector: "EdTech" }),
  startupBase("s6", "FinPulse", "u-other3", { sector: "FinTech" }),
];
const startupById = Object.fromEntries(startups.map((s) => [s.id, s]));
const programById = Object.fromEntries(programs.map((p) => [p.id, p]));

const decision = (appId, status, comment, revisions = []) => ({ id: `d-${appId}`, applicationId: appId, status, comment, decidedById: "u-admin", decidedAt: iso(-8), revisions });
const application = (id, startupId, programId, status, extra = {}) => ({
  id, startupId, programId, status, createdAt: iso(-25), updatedAt: iso(-6),
  motivationLetter: "Notre équipe souhaite rejoindre le programme pour structurer notre développement commercial, valider notre modèle économique auprès de clients industriels et préparer une levée de fonds d'amorçage dans les douze prochains mois.",
  startup: startupById[startupId], program: programById[programId], decision: null, deadlineAt: iso(3), ...extra,
});
export const applications = [
  application("a1", "s1", "p1", "ACCEPTED", { decision: decision("a1", "ACCEPTED", "Dossier solide, équipe complémentaire et marché clairement identifié. Bienvenue dans le programme.", [{ id: "r1", previousStatus: "REJECTED", newStatus: "ACCEPTED", reason: "Réexamen après présentation des premiers contrats clients signés.", revisedAt: iso(-7), revisedBy: { id: "u-admin", email: users.admin.email } }]) }),
  application("a2", "s1", "p2", "REJECTED", { decision: decision("a2", "REJECTED", "Le projet ne correspond pas au périmètre du programme Impact Social.") }),
  application("a3", "s2", "p2", "PENDING"),
  application("a4", "s3", "p1", "PENDING", { deadlineAt: iso(-2) }),
  application("a5", "s5", "p1", "ACCEPTED", { decision: decision("a5", "ACCEPTED", null) }),
  application("a6", "s6", "p2", "PENDING"),
  application("a7", "s4", "p1", "REJECTED", { decision: decision("a7", "REJECTED", "Marché cible insuffisamment documenté.") }),
];
const appById = Object.fromEntries(applications.map((a) => [a.id, a]));

const evaluation = (id, applicationId, evaluator, status, scores, extra = {}) => {
  const [innovationScore, marketScore, teamScore, feasibilityScore, fitScore] = scores;
  const values = scores.filter((v) => v != null);
  return {
    id, applicationId, evaluatorId: evaluator.id, status, innovationScore, marketScore, teamScore, feasibilityScore, fitScore,
    overallScore: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
    strengths: status === "PENDING" ? null : "Équipe fondatrice expérimentée, premiers clients pilotes engagés et forte différenciation technologique sur la traçabilité.",
    weaknesses: status === "PENDING" ? null : "Modèle de revenus encore peu testé ; dépendance à un fournisseur unique pour les capteurs.",
    comment: status === "SUBMITTED" ? "Recommandé sous réserve d'un plan commercial détaillé pour les six premiers mois." : null,
    recommendation: status === "SUBMITTED" ? "FAVORABLE" : null, submittedAt: status === "SUBMITTED" ? iso(-4) : null,
    createdAt: iso(-12), updatedAt: iso(-4), application: appById[applicationId], evaluator: { id: evaluator.id, email: evaluator.email, role: "EVALUATOR" }, ...extra,
  };
};
export const evaluations = [
  evaluation("e1", "a1", users.evaluator, "SUBMITTED", [5, 4, 4, 3, 5]),
  evaluation("e2", "a1", users.evaluator2, "SUBMITTED", [2, 3, 4, 2, 3], { recommendation: "RESERVED" }),
  evaluation("e3", "a3", users.evaluator, "IN_PROGRESS", [4, 3, null, null, null]),
  evaluation("e4", "a4", users.evaluator, "PENDING", [null, null, null, null, null]),
  evaluation("e5", "a6", users.evaluator, "SUBMITTED", [3, 3, 3, 4, 3], { recommendation: "UNFAVORABLE" }),
];

const phases = ["BUILD", "MARKET_VALIDATION", "DIAGNOSTIC", "ONBOARDING"];
export const followUps = [["s1", "a1", "ACTIVE"], ["s5", "a5", "ACTIVE"], ["s3", "a4", "SUSPENDED"], ["s6", "a6", "COMPLETED"]].map(([startupId, applicationId, status], i) => ({
  id: `f${i + 1}`, applicationId, startupId, programId: "p1", status, phase: phases[i], progress: [72, 45, 20, 100][i],
  notes: "Point de vigilance : suivre la signature du partenariat logistique et le recrutement du responsable commercial.",
  startDate: iso(-40), endDate: iso(140), createdAt: iso(-40), updatedAt: iso(-2),
  startup: startupById[startupId], program: programById.p1, application: appById[applicationId],
  objectives: [
    { id: `o${i}a`, followUpId: `f${i + 1}`, title: "Signer trois contrats pilotes avec des industriels de l'agroalimentaire du Grand Tunis", description: "Valider les premiers rendez-vous avec les directions achats et qualité, puis formaliser les conditions du pilote.", priority: "HIGH", status: "IN_PROGRESS", progress: 60, deadlineAt: iso(-3), updatedAt: iso(-5) },
    { id: `o${i}b`, followUpId: `f${i + 1}`, title: "Finaliser le prototype", description: "Préparer la démonstration produit.", priority: "MEDIUM", status: "DONE", progress: 100, deadlineAt: iso(-15), updatedAt: iso(-14) },
    { id: `o${i}c`, followUpId: `f${i + 1}`, title: "Recruter un responsable commercial", description: null, priority: "LOW", status: "BLOCKED", progress: 10, deadlineAt: iso(20), updatedAt: iso(-9) },
    { id: `o${i}d`, followUpId: `f${i + 1}`, title: "Préparer le dossier de levée de fonds", description: "Data room, prévisionnel sur 36 mois, table de capitalisation.", priority: "MEDIUM", status: "TODO", progress: 0, deadlineAt: iso(60), updatedAt: iso(-1) },
  ],
  updates: [2, 9, 16].map((day, j) => ({
    id: `u${i}${j}`, followUpId: `f${i + 1}`, authorId: "u-startup", title: `Compte rendu de la semaine ${j + 1} — avancement commercial et produit`,
    done: "Entretiens avec douze prospects, amélioration du tableau de bord de traçabilité et correction des anomalies remontées par le pilote.",
    blockers: j === 0 ? "Délai de réponse des fournisseurs de capteurs, qui retarde l'installation chez le deuxième client pilote." : null,
    needs: "Mise en relation avec un mentor commercial spécialisé dans la vente aux grands comptes industriels.",
    nextSteps: "Préparer le rendez-vous avec la direction achats et consolider le prévisionnel.", progress: 72 - j * 10, createdAt: iso(-day),
    author: { id: "u-startup", email: users.startup.email, role: "STARTUP" },
    attachments: j === 0 ? [{ id: `att${i}`, updateId: `u${i}${j}`, originalName: "Rapport_pilote_client_industriel_semaine_1_version_signee.pdf", mimeType: "application/pdf", size: 1_234_567, createdAt: iso(-day), uploadedBy: { id: "u-startup", firstName: "Leïla", lastName: "Haddad", email: users.startup.email } }] : [],
  })),
}));

export const notifications = Array.from({ length: 14 }, (_, i) => {
  const kinds = [
    ["DECISION_PUBLISHED", "Décision publiée pour votre candidature", "La décision concernant la candidature de GreenLoop Solutions Environnementales Méditerranée au programme Batch Tech Innovation 2026 a été publiée.", { applicationId: "a1", data: { status: "ACCEPTED", comment: "Dossier solide, équipe complémentaire.", startupName: startups[0].startupName, programTitle: programs[0].title } }],
    ["APPLICATION_ASSIGNED", "Nouvelle candidature à évaluer", "Une candidature vous a été affectée : AgriSmart — Batch Tech Innovation 2026. Échéance dans 3 jours.", { applicationId: "a4", data: { deadlineAt: iso(3), startupName: "AgriSmart" } }],
    ["EVALUATION_SUBMITTED", "Évaluation soumise", "Karim Ben Salah a soumis son évaluation pour MediSync.", { applicationId: "a3" }],
    ["DEADLINE_APPROACHING", "Échéance proche", "L'évaluation de la candidature FinPulse doit être soumise avant demain.", { applicationId: "a6" }],
  ][i % 4];
  return { id: `n${i + 1}`, userId: "x", type: kinds[0], title: kinds[1], message: kinds[2], isRead: i > 3, readAt: i > 3 ? iso(-i) : null, createdAt: iso(-i, 9 + (i % 8)), ...kinds[3] };
});

const comparison = (current, previous) => ({ current, previous, deltaPercent: previous ? Math.round(((current - previous) / previous) * 100) : 0, deltaComparable: previous > 0 });
const period = { currentFrom: iso(-30), currentTo: iso(0), previousFrom: iso(-60), previousTo: iso(-30) };
const dashboard = {
  "dashboard/admin/overview": { period, candidatures: { total: comparison(42, 35), enAttente: 9, enEvaluation: 6, acceptees: comparison(12, 9), rejetees: comparison(15, 16), tauxAcceptation: comparison(29, 26) }, evaluations: { total: comparison(58, 40), enAttente: 11, terminees: comparison(47, 33), delaiMoyenJours: comparison(4, 6), scoreMoyen: comparison(3.6, 3.4), candidaturesEvaluationsCompletes: 18, enRetard: 3 } },
  "dashboard/admin/pipeline": { period, stages: [{ stage: "Candidatures", count: 42 }, { stage: "Évaluation", count: 27 }, { stage: "Sélection", count: 15 }, { stage: "Incubation", count: 12 }] },
  "dashboard/admin/timeseries": { period, granularity: "week", current: [3, 5, 8, 6, 9, 11].map((c, i) => ({ bucket: iso(-35 + i * 7), candidatures: c, acceptations: Math.round(c / 3), delaiMoyenJours: i % 3 ? 4 + i / 2 : null })), previous: [2, 4, 5, 7, 6, 8].map((c, i) => ({ bucket: iso(-65 + i * 7), candidatures: c, acceptations: Math.round(c / 4), delaiMoyenJours: 5 })) },
  "dashboard/admin/decisions": { period, decisions: { enAttente: 9, acceptees: 12, rejetees: 15, total: 36 } },
  "dashboard/admin/incubation": { period, incubation: { startupsActuellementIncubees: 12, progressionMoyenne: 58, objectifs: { todo: 14, inProgress: 21, done: 37, blocked: 4 }, startupsSansUpdateRecent: 3, startupsEnRetard: 2, repartitionParPhase: ["ONBOARDING", "DIAGNOSTIC", "BUILD", "MARKET_VALIDATION", "PITCH_PREPARATION", "CLOSING"].map((phase, i) => ({ phase, count: [2, 3, 4, 2, 1, 0][i] })) } },
  "dashboard/admin/top-startups": { totalStartupsActives: 12, classement: startups.slice(0, 5).map((s, i) => ({ startupId: s.id, startupName: s.startupName, sector: s.sector, score: 92 - i * 9, breakdown: { evaluationScoreNormalized: 80 - i * 5, incubationProgress: 70 - i * 8, objectivesCompletionRate: 65, updateRegularityRate: 90 - i * 10 } })) },
  "dashboard/admin/activity": { activites: notifications.slice(0, 8).map((n) => ({ id: n.id, type: n.type, title: n.title, message: n.message, createdAt: n.createdAt, applicationId: n.applicationId ?? null, programId: null, evaluationId: null, decisionId: null })) },
  "dashboard/admin/insights": { insights: [
    { id: "i1", severity: "critical", title: "3 évaluations en retard", description: "Trois évaluations ont dépassé leur échéance de plus de 48 heures, dont deux sur le programme Batch Tech Innovation 2026.", metric: 3, delta: 2, actionLabel: "Voir les candidatures", actionUrl: "/dashboard/admin/applications?status=PENDING", entityIds: [] },
    { id: "i2", severity: "warning", title: "Startups sans point récent", description: "3 startups incubées n'ont publié aucun compte rendu depuis 14 jours.", metric: 3, delta: null, actionLabel: "Ouvrir le suivi", actionUrl: "/dashboard/admin/incubation-followups", entityIds: [] },
    { id: "i3", severity: "positive", title: "Taux d'acceptation en hausse", description: "+3 points sur la période.", metric: 29, delta: 3, actionLabel: null, actionUrl: null, entityIds: [] },
  ] },
  "dashboard/evaluator/overview": { period, charge: { assignees: 6, aDemarrer: 2, enCours: 1, enRetard: 1 }, production: { soumises: comparison(9, 6), scoreMoyenDonne: 3.4, recommandations: { FAVORABLE: 5, RESERVED: 3, UNFAVORABLE: 1 } }, prochainesEcheances: [
    { applicationId: "a4", startupName: "AgriSmart", programTitle: programs[0].title, deadlineAt: iso(-2), enRetard: true },
    { applicationId: "a3", startupName: "MediSync", programTitle: "Impact Social", deadlineAt: iso(3), enRetard: false },
  ] },
};
const startupOverview = (withIncubation) => ({ period, profils: { total: 2, publies: 1, brouillons: 1 }, candidatures: { total: 3, enAttente: 1, acceptees: 1, rejetees: 1, deposeesSurLaPeriode: comparison(2, 1) }, incubation: withIncubation ? [{ followUpId: "f1", startupName: startups[0].startupName, programTitle: programs[0].title, status: "ACTIVE", phase: "BUILD", progress: 72, startDate: iso(-40), objectifs: { total: 4, termines: 1, enRetard: 1 }, dernierPointAt: iso(-2), pointEnRetard: false }] : [] });

const factors = {
  overdueObjectives: { score: 8, maxScore: 30, applicable: true, dataSufficient: true, count: 1, ratio: 0.3, eligibleCount: 3 },
  blockedObjectives: { score: 6, maxScore: 25, applicable: true, dataSufficient: true, count: 1, ratio: 0.25, eligibleCount: 4 },
  inactivity: { score: 0, maxScore: 20, applicable: true, dataSufficient: true, daysSinceLastUpdate: 2, basis: "LAST_UPDATE" },
  progress: { score: 3, maxScore: 15, applicable: true, dataSufficient: true, averageProgress: 58, source: "OBJECTIVES", excludedRecentObjectives: 0 },
  stagnation: { score: 0, maxScore: 10, applicable: true, dataSufficient: true, recentDelta: 20, measurements: 3 },
};
const vigilanceItem = (f, i) => ({ followUpId: f.id, startupId: f.startupId, startupName: f.startup.startupName, programId: f.programId, programName: f.program.title, status: f.status, phase: f.phase, progress: f.progress, score: [17, 42, 68, 5][i], level: ["LOW", "MEDIUM", "HIGH", "LOW"][i], factors });
const vigilanceList = { items: followUps.map(vigilanceItem), pagination: { page: 1, limit: 20, totalItems: followUps.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
const vigilanceDetail = (id) => {
  const i = Math.max(0, followUps.findIndex((f) => f.id === id));
  const f = followUps[i];
  return { ...vigilanceItem(f, i), aiAnalysis: {
    summary: "La startup progresse régulièrement sur le produit, mais le développement commercial reste en retard sur les objectifs fixés au démarrage du programme. Un accompagnement ciblé sur la prospection grands comptes est recommandé.",
    mainIssues: [{ category: "SALES", title: "Développement commercial", description: "La prospection doit être structurée autour d'un pipeline suivi chaque semaine.", recurrence: "MEDIUM", severity: "MEDIUM", evidenceRefs: ["U1"] }],
    positiveSignals: [{ description: "Prototype finalisé et testé chez un premier client pilote.", evidenceRefs: ["U1"] }], attentionPoints: ["Valider les rendez-vous partenaires avant la fin du mois"],
    suggestedActions: [{ action: "Organiser un atelier commercial avec un mentor spécialisé grands comptes", reason: "Préparer les prochains rendez-vous avec les directions achats", priority: "HIGH", evidenceRefs: ["O1"] }],
  }, ai: { status: "READY", fromCache: true, provider: "anthropic", model: "claude", generatedAt: iso(-1), errorCode: null, message: null },
  evidenceSources: [{ ref: "U1", kind: "UPDATE", id: f.updates[0].id }, { ref: "O1", kind: "OBJECTIVE", id: f.objectives[0].id }],
  meta: { advisoryOnly: true, scoredAt: iso(-1), coverage: { updateLimit: 5, omittedObjectives: 0, textTruncated: false } } };
};
const aiAnalysis = (applicationId) => ({ applicationId, status: "READY", summary: {
  executiveSummary: "Les deux évaluateurs reconnaissent la solidité technique et l'expérience de l'équipe. Ils divergent sur la maturité commerciale : l'un la juge suffisante pour le programme, l'autre recommande de conditionner l'entrée à un plan de prospection détaillé.",
  mainStrengths: ["Équipe complémentaire et expérimentée", "Premiers clients pilotes engagés"], mainWeaknesses: ["Modèle de revenus peu testé"], pointsToClarify: ["Calendrier du premier contrat payant", "Dépendance fournisseur des capteurs"],
}, divergences: ["innovation", "market", "team", "feasibility", "fit"].map((criterion, i) => ({ criterion, mean: 3.5, min: 2, max: 5, range: [3, 1, 0, 1, 2][i], standardDeviation: 1.2, normalizedDivergence: 0.6, severity: ["HIGH", "LOW", "LOW", "LOW", "MEDIUM"][i], explanation: i === 0 ? "L'un des évaluateurs considère la technologie de traçabilité comme une rupture, l'autre comme une intégration de briques existantes." : null, keyDifferences: i === 0 ? ["Degré de nouveauté de la solution", "Protection de la propriété intellectuelle"] : [] })),
meta: { advisoryOnly: true, submittedEvaluations: 2, generatedAt: iso(-1), provider: "anthropic", model: "claude", explanationProvider: null, explanationModel: null, fromCache: true, divergenceStatus: "DETECTED", message: null } });

function summary(applicationId) {
  const list = evaluations.filter((e) => e.applicationId === applicationId);
  const submitted = list.filter((e) => e.status === "SUBMITTED");
  const avg = (key) => (submitted.length ? submitted.reduce((s, e) => s + (e[key] ?? 0), 0) / submitted.length : null);
  return { applicationId, totalAssigned: list.length, submittedCount: submitted.length, averageOverallScore: avg("overallScore"), averageInnovationScore: avg("innovationScore"), averageMarketScore: avg("marketScore"), averageTeamScore: avg("teamScore"), averageFeasibilityScore: avg("feasibilityScore"), averageFitScore: avg("fitScore"), recommendations: { FAVORABLE: 1, RESERVED: 1, UNFAVORABLE: 0 }, evaluations: list };
}

function route(method, path, query, user) {
  const role = user?.role;
  const isNew = user?.id === "u-startup-new";
  const mine = (list) => list.filter((a) => startupById[a.startupId]?.ownerId === user.id);
  if (method !== "GET") return [200, { id: "ok", success: true }];
  if (path === "users/me") return [200, user];
  if (path === "users") return [200, Object.values(users), applications.length];
  if (path === "business-rules") return [200, { MAX_STARTUPS_PER_USER: 5, MAX_ATTACHMENTS_PER_FOLLOWUP_UPDATE: 5 }];
  if (path === "program" || path === "program/public") return [200, programs];
  if (path.startsWith("program/")) return [200, programById[path.split("/")[1]] ?? programs[0]];
  if (path === "program_evaluators/me/programs") return [200, programs.slice(0, 2)];
  if (/^program_evaluators\/[^/]+\/evaluators$/.test(path)) return [200, [users.evaluator, users.evaluator2].map((e) => ({ evaluatorId: e.id, evaluator: e, programId: path.split("/")[1] }))];
  if (path === "startup") return [200, startups];
  if (path === "startup/me") return [200, startups.filter((s) => s.ownerId === user.id)];
  if (path === "startup/public") return [200, startups.slice(0, 5).map((s, i) => ({ ...s, alumni: i === 4, program: programs[0] }))];
  if (/^startup\/[^/]+\/logo$/.test(path) || path.includes("/logo")) return [404, { message: "Aucun logo" }];
  if (path.startsWith("startup/")) return [200, startupById[path.split("/")[1]] ?? startups[0]];
  if (path === "application") {
    let list = applications;
    if (query.get("status")) list = list.filter((a) => a.status === query.get("status"));
    if (query.get("programId")) list = list.filter((a) => a.programId === query.get("programId"));
    if (query.get("search")) list = list.filter((a) => `${a.startup.startupName} ${a.program.title}`.toLowerCase().includes(query.get("search").toLowerCase()));
    return [200, list, list.length];
  }
  if (path === "application/me") return [200, mine(applications)];
  if (/^application(\/me)?\/[^/]+$/.test(path)) return [200, appById[path.split("/").pop()] ?? applications[0]];
  if (path === "application_evaluators/me/applications") return [200, applications.filter((a) => evaluations.some((e) => e.applicationId === a.id && e.evaluatorId === "u-eval"))];
  if (/^application_evaluators\/(me\/)?program\/[^/]+\/applications$/.test(path)) return [200, applications.filter((a) => a.programId === path.split("/").at(-2))];
  if (/^application_evaluators\/[^/]+\/available-evaluators$/.test(path)) return [200, [users.evaluator3]];
  if (/^application_evaluators\/[^/]+\/evaluators$/.test(path)) return [200, evaluations.filter((e) => e.applicationId === path.split("/")[1]).map((e) => ({ evaluatorId: e.evaluatorId, evaluator: Object.values(users).find((u) => u.id === e.evaluatorId), assignedAt: iso(-12), deadlineAt: iso(3) }))];
  if (path === "evaluation/me") return [200, evaluations.filter((e) => e.evaluatorId === user.id)];
  if (/^evaluation\/me\/[^/]+$/.test(path)) return [200, evaluations.find((e) => e.id === path.split("/")[2]) ?? evaluations[0]];
  if (/^evaluation\/application\/[^/]+\/summary$/.test(path)) return [200, summary(path.split("/")[2])];
  if (/^evaluation\/application\/[^/]+$/.test(path)) return [200, evaluations.filter((e) => e.applicationId === path.split("/")[2])];
  if (path === "evaluation") return [200, evaluations];
  if (/^admin\/applications\/[^/]+\/ai-analysis$/.test(path)) return [200, aiAnalysis(path.split("/")[2])];
  if (path === "incubation-followups") return [200, followUps];
  if (path === "incubation-followups/my") return [200, role === "STARTUP" && !isNew ? followUps.slice(0, 1).concat(followUps[2]) : []];
  if (path.startsWith("incubation-followups/")) return [200, followUps.find((f) => f.id === path.split("/")[1]) ?? followUps[0]];
  if (path === "admin/startup-vigilance") return [200, vigilanceList];
  if (path.startsWith("admin/startup-vigilance/")) return [200, vigilanceDetail(path.split("/")[2])];
  if (path === "notifications/unread-count") return [200, { count: 4 }];
  if (path === "notifications") {
    const page = Number(query.get("page") ?? 1), limit = Number(query.get("limit") ?? 20);
    return [200, notifications.slice((page - 1) * limit, page * limit), notifications.length];
  }
  if (path === "dashboard/startup/overview") return [200, startupOverview(!isNew)];
  if (dashboard[path]) return [200, dashboard[path]];
  return [404, { message: `Route factice absente : ${path}` }];
}

export function createApiMock({ port, origin }) {
  const log = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://mock");
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    req.resume();
    req.on("end", () => {
      const user = tokens[(req.headers.authorization ?? "").replace("Bearer ", "")];
      const publicRoute = ["program/public", "startup/public"].includes(path) || path.startsWith("auth/");
      let status, body, total;
      if (!user && !publicRoute) [status, body] = [401, { message: "Unauthorized" }];
      else if (path.startsWith("auth/")) [status, body] = [201, { success: true }];
      else [status, body, total] = route(req.method, path, url.searchParams, user);
      log.push({ method: req.method, path, status });
      const headers = { "Content-Type": "application/json" };
      if (total !== undefined) headers["X-Total-Count"] = String(total);
      res.writeHead(status, headers).end(JSON.stringify(body));
    });
  });
  return {
    log,
    start: () => new Promise((resolve) => server.listen(port, "127.0.0.1", resolve)),
    stop: () => new Promise((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
