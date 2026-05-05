"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Application } from "@/src/types/application";
import type { UserRole } from "@/src/types/auth";
import type {
  Evaluation,
  EvaluationRecommendation,
  EvaluationStatus,
  EvaluationSummary,
  EvaluationUser,
} from "@/src/types/evaluation";
import type { Program } from "@/src/types/program";
import type { Startup } from "@/src/types/startup";

type UpdateEvaluationPayload = Partial<{
  innovationScore: number;
  marketScore: number;
  teamScore: number;
  feasibilityScore: number;
  fitScore: number;
  strengths: string;
  weaknesses: string;
  comment: string;
  recommendation: EvaluationRecommendation;
}>;

type SubmitEvaluationPayload = {
  innovationScore: number;
  marketScore: number;
  teamScore: number;
  feasibilityScore: number;
  fitScore: number;
  strengths: string;
  weaknesses: string;
  comment: string;
  recommendation: EvaluationRecommendation;
};

type EvaluationContextType = {
  myEvaluations: Evaluation[];
  evaluationsByApplicationId: Record<string, Evaluation[]>;
  summariesByApplicationId: Record<string, EvaluationSummary>;
  isEvaluationsLoading: boolean;
  evaluationsError: string | null;
  clearEvaluationsError: () => void;
  clearEvaluationsCache: (applicationId?: string) => void;
  fetchMyEvaluations: () => Promise<Evaluation[]>;
  fetchMyEvaluationById: (evaluationId: string) => Promise<Evaluation>;
  updateMyEvaluation: (evaluationId: string, payload: UpdateEvaluationPayload) => Promise<Evaluation>;
  submitMyEvaluation: (evaluationId: string, payload: SubmitEvaluationPayload) => Promise<Evaluation>;
  fetchEvaluationsByApplication: (applicationId: string) => Promise<Evaluation[]>;
  fetchApplicationSummary: (applicationId: string) => Promise<EvaluationSummary>;
};

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

function toRecord(candidate: unknown): Record<string, unknown> | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return candidate as Record<string, unknown>;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function toSafeRole(value: unknown): UserRole {
  if (value === "ADMIN" || value === "STARTUP" || value === "EVALUATOR") {
    return value;
  }

  return "EVALUATOR";
}

function toSafeStatus(value: unknown): EvaluationStatus | undefined {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return value;
}

function toSafeRecommendation(value: unknown): EvaluationRecommendation | undefined {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  return value;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? null : parsed;
}

function toStartup(candidate: unknown): Startup | undefined {
  const record = toRecord(candidate);

  if (!record) {
    return undefined;
  }

  const id = toString(record.id);
  const startupName = toString(record.startupName);

  if (!id || !startupName) {
    return undefined;
  }

  return {
    id,
    startupName,
    ownerId: toString(record.ownerId) || "",
    description: toString(record.description),
    sector: toString(record.sector),
    stage: toString(record.stage),
    website: toString(record.website),
    status: toString(record.status),
    createdAt: toString(record.createdAt),
    updatedAt: toString(record.updatedAt),
  };
}

function toProgram(candidate: unknown): Program | undefined {
  const record = toRecord(candidate);

  if (!record) {
    return undefined;
  }

  const id = toString(record.id);
  const title = toString(record.title);

  if (!id || !title) {
    return undefined;
  }

  return {
    id,
    title,
    description: toString(record.description) || "",
    openDate: toString(record.openDate) || "",
    closeDate: toString(record.closeDate) || "",
    isOpen:
      typeof record.isOpen === "boolean"
        ? record.isOpen
        : typeof record.isopen === "boolean"
          ? record.isopen
          : false,
    createdAt: toString(record.createdAt) || "",
    updatedAt: toString(record.updatedAt) || toString(record.createdAt) || "",
  };
}

function toApplication(candidate: unknown): Application | undefined {
  const record = toRecord(candidate);

  if (!record) {
    return undefined;
  }

  const startup = toStartup(record.startup);
  const program = toProgram(record.program);
  const id = toString(record.id);

  if (!id) {
    return undefined;
  }

  return {
    id,
    startupId: toString(record.startupId) || startup?.id || "",
    programId: toString(record.programId) || program?.id || "",
    motivationLetter: toString(record.motivationLetter),
    status: toString(record.status),
    createdAt: toString(record.createdAt),
    updatedAt: toString(record.updatedAt),
    startup,
    program,
  };
}

function toEvaluationUser(candidate: unknown): EvaluationUser | undefined {
  const record = toRecord(candidate);

  if (!record) {
    return undefined;
  }

  const id = toString(record.id);
  const email = toString(record.email);

  if (!id || !email) {
    return undefined;
  }

  return {
    id,
    email,
    role: toSafeRole(record.role),
  };
}

function toEvaluation(candidate: unknown): Evaluation | null {
  const record = toRecord(candidate);

  if (!record) {
    return null;
  }

  const id = toString(record.id);

  if (!id) {
    return null;
  }

  const application = toApplication(record.application);
  const evaluator = toEvaluationUser(record.evaluator);

  return {
    id,
    applicationId: toString(record.applicationId) || application?.id,
    evaluatorId: toString(record.evaluatorId) || evaluator?.id,
    innovationScore: toNullableNumber(record.innovationScore),
    marketScore: toNullableNumber(record.marketScore),
    teamScore: toNullableNumber(record.teamScore),
    feasibilityScore: toNullableNumber(record.feasibilityScore),
    fitScore: toNullableNumber(record.fitScore),
    strengths: toString(record.strengths) ?? null,
    weaknesses: toString(record.weaknesses) ?? null,
    comment: toString(record.comment) ?? null,
    recommendation: toSafeRecommendation(record.recommendation) ?? null,
    overallScore: toNullableNumber(record.overallScore),
    status: toSafeStatus(record.status),
    submittedAt: toString(record.submittedAt) ?? null,
    createdAt: toString(record.createdAt),
    updatedAt: toString(record.updatedAt),
    application,
    evaluator,
  };
}

function dedupeEvaluations(evaluations: Evaluation[]): Evaluation[] {
  const map = new Map<string, Evaluation>();

  for (const evaluation of evaluations) {
    if (!map.has(evaluation.id)) {
      map.set(evaluation.id, evaluation);
    }
  }

  return [...map.values()];
}

function extractEvaluationsFromResponse(payload: unknown): Evaluation[] {
  if (Array.isArray(payload)) {
    const evaluations = payload
      .map((item) => {
        const directEvaluation = toEvaluation(item);

        if (directEvaluation) {
          return directEvaluation;
        }

        const record = toRecord(item);

        if (!record) {
          return null;
        }

        return toEvaluation(record.evaluation);
      })
      .filter((evaluation): evaluation is Evaluation => Boolean(evaluation));

    return dedupeEvaluations(evaluations);
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  const directEvaluation = toEvaluation(record);

  if (directEvaluation) {
    return [directEvaluation];
  }

  const nestedKeys = ["evaluations", "data", "items", "evaluation"];

  for (const key of nestedKeys) {
    const nested = record[key];

    if (nested === undefined) {
      continue;
    }

    const nestedEvaluations = extractEvaluationsFromResponse(nested);

    if (nestedEvaluations.length > 0) {
      return nestedEvaluations;
    }
  }

  return [];
}

function extractSingleEvaluationFromResponse(payload: unknown): Evaluation | null {
  const evaluations = extractEvaluationsFromResponse(payload);
  return evaluations.length > 0 ? evaluations[0] : null;
}

function toSummary(payload: unknown, fallbackApplicationId?: string): EvaluationSummary | null {
  const record = toRecord(payload);

  if (!record) {
    return null;
  }

  const applicationId = toString(record.applicationId) || fallbackApplicationId;

  if (!applicationId) {
    return null;
  }

  const recommendationsRecord = toRecord(record.recommendations);
  const recommendations = {
    FAVORABLE: toOptionalNumber(recommendationsRecord?.FAVORABLE) || 0,
    RESERVED: toOptionalNumber(recommendationsRecord?.RESERVED) || 0,
    UNFAVORABLE: toOptionalNumber(recommendationsRecord?.UNFAVORABLE) || 0,
  };

  return {
    applicationId,
    totalAssigned: toOptionalNumber(record.totalAssigned) || 0,
    submittedCount: toOptionalNumber(record.submittedCount) || 0,
    averageOverallScore: toNullableNumber(record.averageOverallScore),
    averageInnovationScore: toNullableNumber(record.averageInnovationScore),
    averageMarketScore: toNullableNumber(record.averageMarketScore),
    averageTeamScore: toNullableNumber(record.averageTeamScore),
    averageFeasibilityScore: toNullableNumber(record.averageFeasibilityScore),
    averageFitScore: toNullableNumber(record.averageFitScore),
    recommendations,
    evaluations: extractEvaluationsFromResponse(record.evaluations),
  };
}

function upsertEvaluation(evaluations: Evaluation[], incoming: Evaluation): Evaluation[] {
  const index = evaluations.findIndex((evaluation) => evaluation.id === incoming.id);

  if (index === -1) {
    return [incoming, ...evaluations];
  }

  const next = [...evaluations];
  next[index] = incoming;
  return next;
}

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [myEvaluations, setMyEvaluations] = useState<Evaluation[]>([]);
  const [evaluationsByApplicationId, setEvaluationsByApplicationId] =
    useState<Record<string, Evaluation[]>>({});
  const [summariesByApplicationId, setSummariesByApplicationId] =
    useState<Record<string, EvaluationSummary>>({});
  const [pendingRequests, setPendingRequests] = useState(0);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);

  const isEvaluationsLoading = pendingRequests > 0;

  const clearEvaluationsError = useCallback(() => {
    setEvaluationsError(null);
  }, []);

  const clearEvaluationsCache = useCallback((applicationId?: string) => {
    if (!applicationId) {
      setEvaluationsByApplicationId({});
      setSummariesByApplicationId({});
      return;
    }

    setEvaluationsByApplicationId((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });

    setSummariesByApplicationId((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const withLoading = useCallback(async <T,>(operation: () => Promise<T>) => {
    setPendingRequests((current) => current + 1);

    try {
      return await operation();
    } finally {
      setPendingRequests((current) => Math.max(0, current - 1));
    }
  }, []);

  const setEvaluationInCaches = useCallback((evaluation: Evaluation) => {
    setMyEvaluations((current) => upsertEvaluation(current, evaluation));

    const applicationId = evaluation.applicationId || evaluation.application?.id;

    if (!applicationId) {
      return;
    }

    setEvaluationsByApplicationId((current) => {
      const existing = current[applicationId] || [];

      return {
        ...current,
        [applicationId]: upsertEvaluation(existing, evaluation),
      };
    });

    setSummariesByApplicationId((current) => {
      const existingSummary = current[applicationId];

      if (!existingSummary) {
        return current;
      }

      return {
        ...current,
        [applicationId]: {
          ...existingSummary,
          evaluations: upsertEvaluation(existingSummary.evaluations, evaluation),
        },
      };
    });
  }, []);

  const fetchMyEvaluations = useCallback(async () => {
    return withLoading(async () => {
      setEvaluationsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>("evaluation/me", {}, authToken);
        const evaluations = extractEvaluationsFromResponse(response);
        setMyEvaluations(evaluations);
        return evaluations;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch evaluations";
        setEvaluationsError(message);
        throw error;
      }
    });
  }, [getRequiredToken, withLoading]);

  const fetchMyEvaluationById = useCallback(
    async (evaluationId: string) => {
      return withLoading(async () => {
        setEvaluationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(`evaluation/me/${evaluationId}`, {}, authToken);
          const evaluation = extractSingleEvaluationFromResponse(response);

          if (!evaluation) {
            throw new Error("Unexpected evaluation payload");
          }

          setEvaluationInCaches(evaluation);
          return evaluation;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to fetch evaluation";
          setEvaluationsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, setEvaluationInCaches, withLoading],
  );

  const updateMyEvaluation = useCallback(
    async (evaluationId: string, payload: UpdateEvaluationPayload) => {
      return withLoading(async () => {
        setEvaluationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `evaluation/me/${evaluationId}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
            authToken,
          );
          const evaluation = extractSingleEvaluationFromResponse(response);

          if (!evaluation) {
            throw new Error("Unexpected evaluation payload");
          }

          setEvaluationInCaches(evaluation);
          return evaluation;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to update evaluation";
          setEvaluationsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, setEvaluationInCaches, withLoading],
  );

  const submitMyEvaluation = useCallback(
    async (evaluationId: string, payload: SubmitEvaluationPayload) => {
      return withLoading(async () => {
        setEvaluationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `evaluation/me/${evaluationId}/submit`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
            authToken,
          );
          const evaluation = extractSingleEvaluationFromResponse(response);

          if (!evaluation) {
            throw new Error("Unexpected evaluation payload");
          }

          setEvaluationInCaches(evaluation);
          return evaluation;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to submit evaluation";
          setEvaluationsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, setEvaluationInCaches, withLoading],
  );

  const fetchEvaluationsByApplication = useCallback(
    async (applicationId: string) => {
      return withLoading(async () => {
        setEvaluationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `evaluation/application/${applicationId}`,
            {},
            authToken,
          );
          const evaluations = extractEvaluationsFromResponse(response);

          setEvaluationsByApplicationId((current) => ({
            ...current,
            [applicationId]: evaluations,
          }));

          return evaluations;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch application evaluations";
          setEvaluationsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const fetchApplicationSummary = useCallback(
    async (applicationId: string) => {
      return withLoading(async () => {
        setEvaluationsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `evaluation/application/${applicationId}/summary`,
            {},
            authToken,
          );
          const summary = toSummary(response, applicationId);

          if (!summary) {
            throw new Error("Unexpected summary payload");
          }

          setSummariesByApplicationId((current) => ({
            ...current,
            [applicationId]: summary,
          }));

          return summary;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch application summary";
          setEvaluationsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const value = useMemo(
    () => ({
      myEvaluations,
      evaluationsByApplicationId,
      summariesByApplicationId,
      isEvaluationsLoading,
      evaluationsError,
      clearEvaluationsError,
      clearEvaluationsCache,
      fetchMyEvaluations,
      fetchMyEvaluationById,
      updateMyEvaluation,
      submitMyEvaluation,
      fetchEvaluationsByApplication,
      fetchApplicationSummary,
    }),
    [
      myEvaluations,
      evaluationsByApplicationId,
      summariesByApplicationId,
      isEvaluationsLoading,
      evaluationsError,
      clearEvaluationsError,
      clearEvaluationsCache,
      fetchMyEvaluations,
      fetchMyEvaluationById,
      updateMyEvaluation,
      submitMyEvaluation,
      fetchEvaluationsByApplication,
      fetchApplicationSummary,
    ],
  );

  return <EvaluationContext.Provider value={value}>{children}</EvaluationContext.Provider>;
}

export function useEvaluations() {
  const context = useContext(EvaluationContext);

  if (!context) {
    throw new Error("useEvaluations must be used inside EvaluationProvider");
  }

  return context;
}
