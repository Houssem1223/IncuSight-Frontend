import assert from "node:assert/strict";
import test from "node:test";

/**
 * Regles metier extraites des ecrans lors des vagues 1 a 3, la ou se trouvaient
 * les defauts corriges. Chacune verrouille un ecart reellement observe, pas une
 * propriete theorique.
 */

const { SCORE_MAX, SCORE_MIN, isValidScore, parseScore } = await import(
  "../src/lib/evaluation-scores.ts"
);
const { getPasswordPolicyError, PASSWORD_MAX_BYTES } = await import(
  "../src/lib/password-policy.ts"
);
const { buildApplicationListPath } = await import("../src/lib/application-query.ts");
const { withPagination, getPageCount, DEFAULT_PAGE_SIZE } = await import(
  "../src/lib/pagination.ts"
);
const { resolveNotificationHref } = await import(
  "../src/components/dashboard/notificationLinks.ts"
);
const { formatFileSize } = await import("../src/lib/follow-up-attachments.ts");
const { isAlumni } = await import("../src/lib/public-showcase.ts");
const { getFollowUpLockMessage, isFollowUpOpen } = await import(
  "../src/lib/incubation-followup-state.ts"
);
const { getNotificationDetails } = await import("../src/lib/notification-details.ts");
const { applicationStatusLabel } = await import("../src/lib/application-status.ts");
const { describeRevisionChange, getDecisionRevisions } = await import(
  "../src/lib/decision-revisions.ts"
);
const { getAttachmentAuthorLabel } = await import("../src/lib/follow-up-attachments.ts");

// --- Notation d'une evaluation ---------------------------------------------
// Le formulaire acceptait 0 a 10 par pas de 0,1 alors que le backend impose
// @IsInt() @Min(1) @Max(5) : toute note decimale partait en 400 a la soumission.

test("les bornes de score reprennent celles du backend", () => {
  assert.equal(SCORE_MIN, 1);
  assert.equal(SCORE_MAX, 5);
});

test("un score decimal ou hors bornes est refuse avant l'envoi", () => {
  assert.equal(isValidScore(3), true);
  assert.equal(isValidScore(1), true);
  assert.equal(isValidScore(5), true);

  assert.equal(isValidScore(3.5), false, "une note decimale doit etre refusee");
  assert.equal(isValidScore(0), false, "0 est sous la borne du backend");
  assert.equal(isValidScore(10), false, "10 est au-dessus de la borne du backend");
  assert.equal(isValidScore(undefined), false);
});

test("parseScore distingue un champ vide d'une valeur invalide", () => {
  assert.equal(parseScore(""), undefined);
  assert.equal(parseScore("   "), undefined);
  assert.equal(parseScore("abc"), undefined);
  assert.equal(parseScore("4"), 4);
});

// --- Politique de mot de passe ---------------------------------------------

test("la limite du mot de passe est comptee en octets UTF-8, pas en caracteres", () => {
  // 30 emojis : 64 unites UTF-16 (sous la limite si on comptait les caracteres)
  // mais 124 octets UTF-8, donc au-dela de la limite bcrypt de 72.
  const emojiPassword = "Aa1!" + "😀".repeat(30);

  assert.equal(
    emojiPassword.length < PASSWORD_MAX_BYTES,
    true,
    "le test perdrait son sens si la longueur en caracteres depassait deja la limite",
  );
  assert.equal(new TextEncoder().encode(emojiPassword).length > PASSWORD_MAX_BYTES, true);
  assert.match(
    getPasswordPolicyError(emojiPassword) ?? "",
    /octets UTF-8/,
    "un mot de passe court en caracteres mais long en octets doit etre refuse",
  );
});

test("chaque exigence de robustesse est controlee", () => {
  assert.match(getPasswordPolicyError("Aa1!") ?? "", /au moins 8/);
  assert.match(getPasswordPolicyError("abcdefg1!") ?? "", /majuscule/);
  assert.match(getPasswordPolicyError("ABCDEFG1!") ?? "", /majuscule/);
  assert.match(getPasswordPolicyError("Abcdefgh!") ?? "", /majuscule/);
  assert.match(getPasswordPolicyError("Abcdefg1") ?? "", /majuscule/);
  assert.equal(getPasswordPolicyError("Strongpass123!"), null);
});

// --- Liste des candidatures -------------------------------------------------
// Le ValidationPipe backend est en forbidNonWhitelisted : un parametre inconnu
// repond 400. `ALL` est une valeur d'affichage, jamais un statut backend.

test("sans filtre ni pagination, le chemin reste la liste complete", () => {
  assert.equal(buildApplicationListPath(), "application");
  assert.equal(buildApplicationListPath({}), "application");
});

test("le statut ALL n'est jamais envoye au backend", () => {
  assert.equal(buildApplicationListPath({ status: "ALL" }), "application");
});

test("pagination et statut sont combines dans une seule query string", () => {
  const path = buildApplicationListPath({ page: 2, limit: 25, status: "PENDING" });

  assert.equal(path.startsWith("application?"), true);
  assert.equal(path.includes("page=2"), true);
  assert.equal(path.includes("limit=25"), true);
  assert.equal(path.includes("status=PENDING"), true);
  assert.equal(path.split("?").length, 2, "une seule query string attendue");
});

test("withPagination omet les cles absentes", () => {
  assert.equal(withPagination("application"), "application");
  assert.equal(withPagination("application", { page: 3 }), "application?page=3");
});

test("getPageCount ne descend jamais sous une page", () => {
  assert.equal(getPageCount(null, DEFAULT_PAGE_SIZE), 1);
  assert.equal(getPageCount(0, DEFAULT_PAGE_SIZE), 1);
  assert.equal(getPageCount(1, 25), 1);
  assert.equal(getPageCount(25, 25), 1);
  assert.equal(getPageCount(26, 25), 2);
  assert.equal(getPageCount(51, 25), 3);
});

// --- Routage des notifications ---------------------------------------------
// Les identifiants etaient renseignes a l'emission et lus par personne.

test("l'admin est route vers la candidature concernee, filtre sur son id", () => {
  const href = resolveNotificationHref({ id: "n1", applicationId: "app-42" }, "ADMIN");

  assert.equal(href, "/dashboard/admin/applications?search=app-42");
});

test("chaque role est route vers son propre ecran", () => {
  assert.equal(
    resolveNotificationHref({ id: "n1", evaluationId: "e1" }, "EVALUATOR"),
    "/dashboard/evaluateur/reviews",
  );
  assert.equal(
    resolveNotificationHref({ id: "n1", applicationId: "a1" }, "STARTUP"),
    "/dashboard/startup/candidatures",
  );
});

test("sans identifiant exploitable, aucun lien n'est propose", () => {
  assert.equal(resolveNotificationHref({ id: "n1" }, "ADMIN"), null);
  assert.equal(resolveNotificationHref({ id: "n1", applicationId: "a1" }, undefined), null);
});

// --- Divers ----------------------------------------------------------------

test("la taille de fichier reste lisible et ne rend jamais NaN", () => {
  assert.equal(formatFileSize(0), "-");
  assert.equal(formatFileSize(Number.NaN), "-");
  assert.equal(formatFileSize(512), "512 o");
  assert.equal(formatFileSize(2048), "2 Ko");
  assert.equal(formatFileSize(5 * 1024 * 1024), "5.0 Mo");
});

test("une incubation terminee ou abandonnee bascule chez les alumni", () => {
  assert.equal(isAlumni({ incubationStatus: "COMPLETED" }), true);
  assert.equal(isAlumni({ incubationStatus: "DROPPED" }), true);
  assert.equal(isAlumni({ incubationStatus: "ACTIVE" }), false);
  assert.equal(isAlumni({ incubationStatus: null }), false);
});

// --- Etats terminaux du suivi d'incubation ---------------------------------
// Les statuts etaient libelles et colores, mais aucun ecran n'en tirait de
// consequence : on pouvait publier un compte rendu sur un suivi DROPPED.

test("seul un suivi ACTIVE accepte l'ecriture", () => {
  assert.equal(isFollowUpOpen("ACTIVE"), true);
  assert.equal(isFollowUpOpen(undefined), true, "statut absent = actif, comme cote backend");
  assert.equal(isFollowUpOpen("COMPLETED"), false);
  assert.equal(isFollowUpOpen("SUSPENDED"), false);
  assert.equal(isFollowUpOpen("DROPPED"), false);
});

test("le message de verrouillage n'apparait que sur un suivi ferme", () => {
  assert.equal(getFollowUpLockMessage("ACTIVE", "STARTUP"), null);
  assert.equal(getFollowUpLockMessage(undefined, "ADMIN"), null);

  const startupMessage = getFollowUpLockMessage("DROPPED", "STARTUP");
  assert.equal(typeof startupMessage, "string");
  assert.equal(startupMessage.includes("abandonné"), true);
  assert.equal(startupMessage.includes("compte rendu"), true);

  const adminMessage = getFollowUpLockMessage("COMPLETED", "ADMIN");
  assert.equal(adminMessage.includes("Actif"), true, "l'admin doit savoir comment rouvrir");
});

// --- Contenu des notifications ---------------------------------------------
// `data` portait le contexte de l'evenement et n'etait lu par personne.

test("le contexte porte par `data` est restitue", () => {
  const details = getNotificationDetails({
    id: "n1",
    data: {
      status: "ACCEPTED",
      comment: "Dossier solide, equipe complete.",
      programName: "Saison 4",
      startupName: "Acme",
    },
  });

  assert.equal(details.comment, "Dossier solide, equipe complete.");
  assert.deepEqual(details.facts, [
    { label: "Startup", value: "Acme" },
    { label: "Programme", value: "Saison 4" },
    { label: "Statut", value: "Acceptée" },
  ]);
});

test("une notification sans `data` exploitable ne rend rien", () => {
  assert.deepEqual(getNotificationDetails({ id: "n1" }), {
    comment: null,
    deadlineAt: null,
    facts: [],
  });
  assert.deepEqual(getNotificationDetails({ id: "n1", data: { comment: "   " } }).facts, []);
  assert.equal(getNotificationDetails({ id: "n1", data: { comment: "   " } }).comment, null);
});

test("l'echeance est renvoyee brute, le formatage reste a l'ecran", () => {
  const details = getNotificationDetails({
    id: "n1",
    data: { deadlineAt: "2026-09-30T12:00:00.000Z" },
  });

  assert.equal(details.deadlineAt, "2026-09-30T12:00:00.000Z");
});

// --- Historique des revisions de decision -----------------------------------
// `DecisionRevision` etait ecrite a chaque revision et relue par personne.

test("les revisions sont rendues du plus recent au plus ancien", () => {
  const revisions = getDecisionRevisions({
    id: "d1",
    revisions: [
      { id: "r1", previousStatus: "PENDING", newStatus: "ACCEPTED", reason: "a", revisedAt: "2026-09-10T10:00:00.000Z" },
      { id: "r2", previousStatus: "ACCEPTED", newStatus: "REJECTED", reason: "b", revisedAt: "2026-09-16T10:00:00.000Z" },
    ],
  });

  assert.deepEqual(
    revisions.map((revision) => revision.id),
    ["r2", "r1"],
    "l'ordre d'affichage ne doit pas dependre du orderBy de la requete",
  );
});

test("une decision jamais revisee ne rend aucun historique", () => {
  assert.deepEqual(getDecisionRevisions(null), []);
  assert.deepEqual(getDecisionRevisions({ id: "d1" }), []);
  assert.deepEqual(getDecisionRevisions({ id: "d1", revisions: [] }), []);
});

test("le changement de statut est decrit en libelles d'interface", () => {
  assert.equal(
    describeRevisionChange({ id: "r1", previousStatus: "REJECTED", newStatus: "ACCEPTED", reason: "x" }),
    "Refusée → Acceptée",
  );
});

test("un statut inconnu de l'UI est affiche tel quel, jamais vide", () => {
  assert.equal(applicationStatusLabel("PENDING"), "En attente");
  assert.equal(applicationStatusLabel("accepted"), "Acceptée");
  assert.equal(applicationStatusLabel("WAITLISTED"), "WAITLISTED");
  assert.equal(applicationStatusLabel(undefined), "-");
});

// --- Auteur d'un livrable ---------------------------------------------------
// `uploadedById` etait ecrit en base et expose par personne.

test("l'auteur d'un livrable retombe sur l'email puis sur null", () => {
  assert.equal(
    getAttachmentAuthorLabel({ id: "a1", uploadedBy: { id: "u1", firstName: "Ada", lastName: "Lovelace" } }),
    "Ada Lovelace",
  );
  assert.equal(
    getAttachmentAuthorLabel({ id: "a1", uploadedBy: { id: "u1", email: "ada@x.tld" } }),
    "ada@x.tld",
  );
  assert.equal(getAttachmentAuthorLabel({ id: "a1" }), null);
});
