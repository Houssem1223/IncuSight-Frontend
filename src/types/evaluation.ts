import type { Application } from "./application";
import type { User } from "./user";

export type EvaluationStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | string;

export type EvaluationRecommendation = "FAVORABLE" | "RESERVED" | "UNFAVORABLE" | string;

export type EvaluationUser = Pick<User, "id" | "email" | "role">;

export type Evaluation = {
  id: string;
  applicationId?: string;
  evaluatorId?: string;
  innovationScore?: number | null;
  marketScore?: number | null;
  teamScore?: number | null;
  feasibilityScore?: number | null;
  fitScore?: number | null;
  strengths?: string | null;
  weaknesses?: string | null;
  comment?: string | null;
  recommendation?: EvaluationRecommendation | null;
  overallScore?: number | null;
  status?: EvaluationStatus;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  application?: Application;
  evaluator?: EvaluationUser;
  [key: string]: unknown;
};

export type EvaluationRecommendationCounts = {
  FAVORABLE: number;
  RESERVED: number;
  UNFAVORABLE: number;
};

export type EvaluationSummary = {
  applicationId: string;
  totalAssigned: number;
  submittedCount: number;
  averageOverallScore: number | null;
  averageInnovationScore: number | null;
  averageMarketScore: number | null;
  averageTeamScore: number | null;
  averageFeasibilityScore: number | null;
  averageFitScore: number | null;
  recommendations: EvaluationRecommendationCounts;
  evaluations: Evaluation[];
};
