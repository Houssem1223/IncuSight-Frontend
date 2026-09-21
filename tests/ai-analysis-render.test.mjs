import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ApplicationAiAnalysisCard from "../src/components/dashboard/admin/evaluations/ApplicationAiAnalysisCard.tsx";
import { ApiError } from "../src/lib/api.ts";
import { aiAnalysisQueryKey, invalidateApplicationAiAnalysis } from "../src/lib/ai-analysis-query.ts";

const key = aiAnalysisQueryKey("app-1");
const ready = {
  applicationId: "app-1", status: "READY",
  summary: { executiveSummary: "Ancienne synthese", mainStrengths: ["Force"], mainWeaknesses: ["Faiblesse"], pointsToClarify: ["Question"] },
  divergences: [],
  meta: { submittedEvaluations: 1, generatedAt: "2026-09-18T12:00:00Z", divergenceStatus: "INSUFFICIENT_EVALUATIONS" },
};

function clientFor(t) {
  // Garder l'état d'erreur préparé pour ce rendu serveur, sans nouvelle tentative
  // au montage. Les interactions du cache sont testées avec les vrais observers.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  return client;
}

function render(client, submittedEvaluations = 1) {
  return renderToStaticMarkup(createElement(QueryClientProvider, { client },
    createElement(ApplicationAiAnalysisCard, { applicationId: "app-1", submittedEvaluations })));
}

test("un GET en erreur affiche une alerte et un reessai, jamais une fausse absence", async (t) => {
  const client = clientFor(t);
  await client.fetchQuery({ queryKey: key, queryFn: async () => { throw new ApiError("failure", 500, null); } }).catch(() => {});
  const html = render(client);
  assert.match(html, /role="alert"/);
  assert.match(html, /temporairement indisponible/);
  assert.match(html, /Réessayer le chargement/);
  assert.doesNotMatch(html, /Aucune analyse IA/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Générer l’analyse<\/button>/);
});

test("une absence confirmee par le serveur affiche bien l'etat vide", (t) => {
  const client = clientFor(t);
  client.setQueryData(key, { applicationId: "app-1", status: "NOT_GENERATED", analysis: null });
  assert.match(render(client), /Aucune analyse IA n’a encore été générée/);
});

test("une analyse READY affiche sa synthese et les trois listes", (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  const html = render(client);
  for (const text of ["Ancienne synthese", "Force", "Faiblesse", "Question", "MEDIANET", "au moins deux évaluations soumises"]) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /<button|Actualiser l’analyse|Générer l’analyse|role="dialog"/);
});

for (const count of [0, 1]) {
  test(`apres reouverture avec ${count} avis restant, la synthese precedente disparait`, async (t) => {
    const client = clientFor(t);
    client.setQueryData(key, ready);
    await invalidateApplicationAiAnalysis(client, "app-1");
    const html = render(client, count);
    assert.doesNotMatch(html, /Ancienne synthese|Aucune analyse IA/);
    assert.match(html, count === 0 ? /ai-analysis-unavailable/ : /Les évaluations ont changé/);
    assert.match(html, /<button[^>]*>Actualiser l’analyse<\/button>/);
    assert.doesNotMatch(html, /role="dialog"/);
  });
}

test("le premier chargement ne permet pas de lancer une generation concurrente", (t) => {
  const html = render(clientFor(t));
  assert.match(html, /Chargement de l’analyse/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Générer l’analyse<\/button>/);
  assert.doesNotMatch(html, /Aucune analyse IA/);
});
