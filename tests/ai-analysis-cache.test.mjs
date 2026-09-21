import assert from "node:assert/strict";
import { test } from "node:test";
import { MutationObserver, QueryClient, QueryObserver } from "@tanstack/react-query";
import { ApiError } from "../src/lib/api.ts";
import {
  aiAnalysisQueryKey,
  applicationAiAnalysisMutationOptions,
  applicationAiAnalysisOptions,
  invalidateApplicationAiAnalysis,
} from "../src/lib/ai-analysis-query.ts";

const key = aiAnalysisQueryKey("app-1");
const ready = { applicationId: "app-1", status: "READY", summary: { executiveSummary: "Ancien avis" } };
const missing = { applicationId: "app-1", status: "NOT_GENERATED", analysis: null };
const stale = { applicationId: "app-1", status: "STALE", analysis: null };

function clientFor(t) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  return client;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("rouvrir un avis masque le cache READY avant la fin de la relecture", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  client.setQueryData(aiAnalysisQueryKey("app-2"), ready);
  const read = deferred();
  const started = deferred();
  const observer = new QueryObserver(client, {
    ...applicationAiAnalysisOptions("app-1"),
    refetchOnMount: false,
    queryFn: () => { started.resolve(); return read.promise; },
  });
  t.after(observer.subscribe(() => {}));

  const invalidation = invalidateApplicationAiAnalysis(client, "app-1");
  await started.promise;
  assert.equal(client.getQueryData(key).status, "STALE");
  assert.equal(client.getQueryData(key).summary, undefined);
  assert.equal(client.getQueryData(aiAnalysisQueryKey("app-2")).status, "READY");
  read.resolve(stale);
  await invalidation;
  assert.equal(observer.getCurrentResult().data.status, "STALE");
});

test("une relecture en erreur apres reouverture ne restaure pas l'ancien avis", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  const observer = new QueryObserver(client, {
    ...applicationAiAnalysisOptions("app-1"), retry: false, refetchOnMount: false,
    queryFn: async () => { throw new Error("offline"); },
  });
  t.after(observer.subscribe(() => {}));
  await invalidateApplicationAiAnalysis(client, "app-1");
  assert.equal(observer.getCurrentResult().isError, true);
  assert.equal(observer.getCurrentResult().data.status, "STALE");
});

test("une lecture tardive ne restaure pas READY apres reouverture", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  const read = deferred();
  const pending = client.fetchQuery({ queryKey: key, queryFn: () => read.promise }).catch(() => {});
  await invalidateApplicationAiAnalysis(client, "app-1");
  read.resolve(ready);
  await pending;
  assert.equal(client.getQueryData(key).status, "STALE");
});

for (const action of ["generate", "refresh"]) {
  test(`${action} annule les GET anterieurs et ceux demarres pendant le POST`, async (t) => {
    const client = clientFor(t);
    if (action === "refresh") client.setQueryData(key, ready);
    const oldRead = deferred();
    const oldPending = client.fetchQuery({ queryKey: key, queryFn: () => oldRead.promise }).catch(() => {});
    const generated = deferred();
    const started = deferred();
    const updated = { ...ready, summary: { executiveSummary: "Nouvelle synthese" } };
    let calls = 0;
    const mutation = new MutationObserver(client, applicationAiAnalysisMutationOptions(client, "app-1", async () => {
      calls++;
      started.resolve();
      return generated.promise;
    }));
    const pendingMutation = mutation.mutate();
    await started.promise;
    if (action === "refresh") assert.deepEqual(client.getQueryData(key), ready);
    oldRead.resolve(missing);
    await oldPending;
    const duringRead = deferred();
    const duringPending = client.fetchQuery({ queryKey: key, queryFn: () => duringRead.promise }).catch(() => {});
    generated.resolve(updated);
    await pendingMutation;
    duringRead.resolve(missing);
    await duringPending;
    assert.equal(calls, 1);
    assert.deepEqual(client.getQueryData(key), updated);
  });
}

test("une reouverture pendant le POST empeche sa reponse de restaurer une analyse perimee", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  const generated = deferred();
  const started = deferred();
  const mutation = new MutationObserver(client, applicationAiAnalysisMutationOptions(client, "app-1", async () => {
    started.resolve(); return generated.promise;
  }));
  const pending = mutation.mutate();
  await started.promise;
  await invalidateApplicationAiAnalysis(client, "app-1");
  generated.resolve(ready);
  await pending;
  assert.equal(client.getQueryData(key).status, "STALE");
  assert.equal(client.getQueryState(key).isInvalidated, true);
});

test("un echec de regeneration conserve l'analyse et ne retente pas le POST", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  let calls = 0;
  const mutation = new MutationObserver(client, applicationAiAnalysisMutationOptions(client, "app-1", async () => {
    calls++; throw new Error("provider unavailable");
  }));
  await assert.rejects(mutation.mutate(), /provider unavailable/);
  assert.equal(calls, 1);
  assert.deepEqual(client.getQueryData(key), ready);
});

test("le retour au premier plan et le remontage relisent les changements externes", async (t) => {
  const client = clientFor(t);
  client.setQueryData(key, ready);
  let calls = 0;
  const observer = new QueryObserver(client, {
    ...applicationAiAnalysisOptions("app-1"),
    queryFn: async () => { calls++; return stale; },
  });
  assert.equal(observer.shouldFetchOnWindowFocus(), true);
  await new Promise((resolve) => {
    t.after(observer.subscribe((result) => {
      if (result.data?.status === "STALE") resolve();
    }));
  });
  assert.equal(calls, 1);
  assert.equal(observer.getCurrentResult().data.status, "STALE");
});

test("403 et 404 ne sont pas retentes, une panne reseau ne l'est qu'une fois", () => {
  const { retry } = applicationAiAnalysisOptions("app-1");
  assert.equal(retry(0, new ApiError("forbidden", 403, {})), false);
  assert.equal(retry(0, new ApiError("not found", 404, {})), false);
  assert.equal(retry(0, new TypeError("offline")), true);
  assert.equal(retry(1, new TypeError("offline")), false);
});
