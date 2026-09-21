/**
 * Analyse IA des evaluations d'une candidature.
 *
 * Types recopies depuis le contrat reel du module `ai` du backend
 * (`IncuSight-Backend/src/modules/ai/types/analysis-response.types.ts`,
 * `dto/ai-output.dto.ts`, documente dans `IncuSight-Backend/docs/AI_ANALYSIS.md`).
 * Si le backend change une forme de reponse, mettre a jour ce fichier ET
 * `docs/ai-analysis-frontend.md` dans la meme tache.
 *
 * Le frontend n'appelle jamais un fournisseur IA : il lit le resultat calcule et
 * valide par le backend. Aucune statistique n'est recalculee ici.
 */

export type DivergenceSeverity = "LOW" | "MEDIUM" | "HIGH";

/** Les 5 criteres de la grille d'evaluation, tels que nommes par le backend. */
export type AnalysisCriterion = "innovation" | "market" | "team" | "feasibility" | "fit";

export type DivergenceStatus =
  | "INSUFFICIENT_EVALUATIONS"
  | "NO_SIGNIFICANT_DIVERGENCE"
  | "DETECTED";

/**
 * Synthese redigee par le modele, validee cote serveur (longueurs bornees,
 * aucun champ de decision accepte).
 *
 * Prefixee `Ai` parce que `EvaluationSummary` designe deja, dans
 * `src/types/evaluation.ts`, la synthese chiffree des evaluations d'une
 * candidature (assignes / soumis / moyennes) : ce sont deux objets differents.
 */
export type AiEvaluationSummary = {
  executiveSummary: string;
  mainStrengths: string[];
  mainWeaknesses: string[];
  pointsToClarify: string[];
};

/**
 * Statistiques deterministes d'un critere + explication IA eventuelle.
 *
 * Les notes sont sur l'echelle 1-5 du backend. `normalizedDivergence` vaut
 * `standardDeviation / 4` et plafonne donc a 0,5 : c'est une aide a la lecture,
 * pas une mesure de significativite statistique.
 * `explanation` vaut `null` pour les criteres LOW (aucun appel au modele).
 */
export type CriterionDivergence = {
  criterion: AnalysisCriterion;
  mean: number;
  min: number;
  max: number;
  range: number;
  standardDeviation: number;
  normalizedDivergence: number;
  severity: DivergenceSeverity;
  explanation: string | null;
  keyDifferences: string[];
};

export type AiAnalysisMeta = {
  /** Toujours vrai : le module ne produit qu'une aide a la lecture. */
  advisoryOnly: true;
  submittedEvaluations: number;
  generatedAt: string;
  /** Provenance de la synthese. Detail technique, pas une information metier. */
  provider: string;
  model: string;
  /** Provenance de l'explication des divergences, qui peut differer. */
  explanationProvider: string | null;
  explanationModel: string | null;
  fromCache: boolean;
  divergenceStatus: DivergenceStatus;
  /** Message metier du backend, deja redige en francais (ou null). */
  message: string | null;
};

export type ReadyAiAnalysis = {
  applicationId: string;
  status: "READY";
  summary: AiEvaluationSummary;
  divergences: CriterionDivergence[];
  meta: AiAnalysisMeta;
};

/**
 * `NOT_GENERATED` : aucune analyse en base.
 * `STALE` : une analyse existe mais les evaluations (ou les regles d'analyse)
 * ont change depuis. Le backend refuse de la servir telle quelle plutot que de
 * laisser croire qu'elle porte sur les avis actuels.
 */
export type MissingAiAnalysis = {
  applicationId: string;
  status: "NOT_GENERATED" | "STALE";
  analysis: null;
  message: string;
};

/** Reponse du GET : lecture seule, ne declenche jamais d'appel au modele. */
export type ApplicationAiAnalysis = ReadyAiAnalysis | MissingAiAnalysis;
