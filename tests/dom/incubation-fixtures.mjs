export const programs = [{ id: "p1", title: "Batch Tech Innovation" }];
export const admin = { id: "admin", email: "admin@example.test", firstName: "Samira", lastName: "Martin", role: "ADMIN", isActive: true };
export const factors = {
  overdueObjectives: { score: 8, maxScore: 30, applicable: true, dataSufficient: true, count: 1, ratio: .3, eligibleCount: 3 },
  blockedObjectives: { score: 0, maxScore: 25, applicable: true, dataSufficient: true, count: 0, ratio: 0, eligibleCount: 3 },
  inactivity: { score: 0, maxScore: 20, applicable: true, dataSufficient: true, daysSinceLastUpdate: 2, basis: "LAST_UPDATE" },
  progress: { score: 3, maxScore: 15, applicable: true, dataSufficient: true, averageProgress: 80, source: "OBJECTIVES", excludedRecentObjectives: 0 },
  stagnation: { score: 0, maxScore: 10, applicable: true, dataSufficient: true, recentDelta: 20, measurements: 3 },
};
export const initialFollowUps = ["EcoPack", "MediSync", "AgriSmart", "NovaCharge"].map((name, i) => ({
  id: `f${i + 1}`, applicationId: `a${i + 1}`, startupId: `s${i + 1}`, programId: "p1",
  startup: { id: `s${i + 1}`, startupName: name }, program: programs[0],
  status: "ACTIVE", phase: "BUILD", progress: 80, startDate: "2026-08-28", createdAt: "2026-08-28T12:00:00Z", notes: `Contexte de ${name}`,
  objectives: [
    { id: `o${i}a`, followUpId: `f${i+1}`, title: "Lancer la campagne B2B", description: "Valider les premiers rendez-vous avec les partenaires.", priority: "HIGH", status: "IN_PROGRESS", progress: 60, deadlineAt: "2026-09-25", updatedAt: "2026-09-19T12:00:00Z" },
    { id: `o${i}b`, followUpId: `f${i+1}`, title: "Finaliser le prototype", description: "Préparer la démonstration produit.", priority: "MEDIUM", status: "DONE", progress: 100, deadlineAt: "2026-09-10" },
  ],
  updates: [3, 1, 4, 2].map(day => ({ id: `u${i}${day}`, followUpId: `f${i+1}`, authorId: `s${i+1}`, title: `Point du ${day} septembre`, done: day === 4 ? "Pitch deck finalisé et prototype testé." : "Entretiens clients et amélioration du produit.", nextSteps: "Préparer le prochain rendez-vous partenaires.", blockers: "Délai de réponse des fournisseurs.", needs: "Mise en relation avec un mentor commercial.", progress: 80, createdAt: `2026-09-0${day}T12:00:00Z`, attachments: [] })),
}));
export const applications = [{ id: "a5", status: "ACCEPTED", startupId: "s5", programId: "p1", startup: { id: "s5", startupName: "GreenLoop" }, program: programs[0] }];
export function listResponse(followUps) {
  const items = followUps.map(f => ({ followUpId: f.id, startupId: f.startupId, startupName: f.startup.startupName, programId: f.programId, programName: f.program.title, status: f.status, phase: f.phase, progress: 80, score: 11, level: "LOW", factors }));
  return { items, pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: items.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false } };
}
export function detailResponse(followUp, ready = false) {
  return { ...listResponse([followUp]).items[0], aiAnalysis: ready ? {
    summary: "La startup progresse régulièrement. Le développement commercial mérite un accompagnement ciblé.",
    mainIssues: [{ category: "SALES", title: "Développement commercial", description: "La prospection doit être structurée.", recurrence: "MEDIUM", severity: "MEDIUM", evidenceRefs: ["U1"] }],
    positiveSignals: [{ description: "Prototype finalisé", evidenceRefs: ["U1"] }], attentionPoints: ["Valider les rendez-vous partenaires"],
    suggestedActions: [{ action: "Organiser un atelier commercial", reason: "Préparer les prochains rendez-vous", priority: "MEDIUM", evidenceRefs: ["O1"] }],
  } : null, ai: { status: ready ? "READY" : "NOT_GENERATED", fromCache: ready, provider: null, model: null, generatedAt: ready ? "2026-09-20T12:00:00Z" : null, errorCode: null, message: null },
    evidenceSources: [{ ref: "U1", kind: "UPDATE", id: followUp.updates[0].id }, { ref: "O1", kind: "OBJECTIVE", id: followUp.objectives[0].id }],
    meta: { advisoryOnly: true, scoredAt: "2026-09-20T12:00:00Z", coverage: { updateLimit: 5, omittedObjectives: 0, textTruncated: false } },
  };
}
