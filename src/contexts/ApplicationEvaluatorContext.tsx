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
import type { Program } from "@/src/types/program";
import type { Startup } from "@/src/types/startup";
import type { User } from "@/src/types/user";

type ApplicationEvaluatorContextType = {
  evaluatorsByApplicationId: Record<string, User[]>;
  availableEvaluatorsByApplicationId: Record<string, User[]>;
  adminApplicationsByProgramId: Record<string, Application[]>;
  myAssignedApplicationsByProgramId: Record<string, Application[]>;
  myAssignedApplications: Application[];
  isApplicationEvaluatorsLoading: boolean;
  applicationEvaluatorsError: string | null;
  clearApplicationEvaluatorsError: () => void;
  clearApplicationEvaluatorsCache: (applicationId?: string) => void;
  clearAvailableEvaluatorsCache: (applicationId?: string) => void;
  clearAdminApplicationsByProgramCache: (programId?: string) => void;
  clearMyAssignedApplicationsByProgramCache: (programId?: string) => void;
  fetchApplicationEvaluators: (applicationId: string) => Promise<User[]>;
  fetchAvailableEvaluatorsForApplication: (applicationId: string) => Promise<User[]>;
  fetchApplicationsByProgramForAdmin: (programId: string) => Promise<Application[]>;
  fetchMyAssignedApplications: () => Promise<Application[]>;
  fetchMyAssignedApplicationsByProgram: (programId: string) => Promise<Application[]>;
  assignApplicationEvaluator: (applicationId: string, evaluatorId: string) => Promise<User[]>;
  removeApplicationEvaluator: (applicationId: string, evaluatorId: string) => Promise<User[]>;
};

const ApplicationEvaluatorContext =
  createContext<ApplicationEvaluatorContextType | undefined>(undefined);

function toSafeRole(value: unknown): UserRole {
  if (value === "ADMIN" || value === "STARTUP" || value === "EVALUATOR") {
    return value;
  }

  return "EVALUATOR";
}

function toUser(candidate: unknown): User | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const id = record.id;
  const email = record.email;

  if (typeof id !== "string" || !id || typeof email !== "string" || !email) {
    return null;
  }

  return {
    id,
    email,
    role: toSafeRole(record.role),
    firstName: typeof record.firstName === "string" ? record.firstName : undefined,
    lastName: typeof record.lastName === "string" ? record.lastName : undefined,
    isActive: typeof record.isActive === "boolean" ? record.isActive : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}

function dedupeUsers(users: User[]): User[] {
  const map = new Map<string, User>();

  for (const user of users) {
    if (!map.has(user.id)) {
      map.set(user.id, user);
    }
  }

  return [...map.values()];
}

function extractUsersFromResponse(payload: unknown): User[] {
  if (Array.isArray(payload)) {
    const users = payload
      .map((item) => {
        const directUser = toUser(item);

        if (directUser) {
          return directUser;
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const itemRecord = item as Record<string, unknown>;

        return (
          toUser(itemRecord.evaluator) ||
          toUser(itemRecord.user) ||
          toUser(itemRecord.evaluateur)
        );
      })
      .filter((user): user is User => Boolean(user));

    return dedupeUsers(users);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;

    const directUser = toUser(objectPayload);

    if (directUser) {
      return [directUser];
    }

    const nestedKeys = ["evaluators", "assignments", "data", "items"];

    for (const key of nestedKeys) {
      const nested = objectPayload[key];

      if (nested === undefined) {
        continue;
      }

      const nestedUsers = extractUsersFromResponse(nested);

      if (nestedUsers.length > 0) {
        return nestedUsers;
      }
    }
  }

  return [];
}

function toStartup(candidate: unknown): Startup | undefined {
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const record = candidate as Record<string, unknown>;

  if (typeof record.id !== "string" || typeof record.startupName !== "string") {
    return undefined;
  }

  return {
    id: record.id,
    startupName: record.startupName,
    ownerId: typeof record.ownerId === "string" ? record.ownerId : "",
    description: typeof record.description === "string" ? record.description : undefined,
    sector: typeof record.sector === "string" ? record.sector : undefined,
    stage: typeof record.stage === "string" ? record.stage : undefined,
    website: typeof record.website === "string" ? record.website : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
  };
}

function toProgram(candidate: unknown): Program | undefined {
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const record = candidate as Record<string, unknown>;

  if (typeof record.id !== "string" || typeof record.title !== "string") {
    return undefined;
  }

  return {
    id: record.id,
    title: record.title,
    description: typeof record.description === "string" ? record.description : "",
    openDate: typeof record.openDate === "string" ? record.openDate : "",
    closeDate: typeof record.closeDate === "string" ? record.closeDate : "",
    isOpen:
      typeof record.isOpen === "boolean"
        ? record.isOpen
        : typeof record.isopen === "boolean"
          ? record.isopen
          : false,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

function toApplication(candidate: unknown): Application | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const startupId = typeof record.startupId === "string" ? record.startupId : null;
  const programId = typeof record.programId === "string" ? record.programId : null;

  if (!id || !startupId || !programId) {
    return null;
  }

  return {
    id,
    startupId,
    programId,
    motivationLetter:
      typeof record.motivationLetter === "string" ? record.motivationLetter : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    startup: toStartup(record.startup),
    program: toProgram(record.program),
    assignmentId: typeof record.assignmentId === "string" ? record.assignmentId : undefined,
    assignedAt: typeof record.assignedAt === "string" ? record.assignedAt : undefined,
    myEvaluation:
      record.myEvaluation && typeof record.myEvaluation === "object"
        ? record.myEvaluation
        : undefined,
  };
}

function dedupeApplications(applications: Application[]): Application[] {
  const map = new Map<string, Application>();

  for (const application of applications) {
    if (!map.has(application.id)) {
      map.set(application.id, application);
    }
  }

  return [...map.values()];
}

function extractApplicationsFromResponse(payload: unknown): Application[] {
  if (Array.isArray(payload)) {
    const applications = payload
      .map((item) => {
        const directApplication = toApplication(item);

        if (directApplication) {
          return directApplication;
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const itemRecord = item as Record<string, unknown>;

        return toApplication(itemRecord.application);
      })
      .filter((application): application is Application => Boolean(application));

    return dedupeApplications(applications);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;

    const directApplication = toApplication(objectPayload);

    if (directApplication) {
      return [directApplication];
    }

    const nestedKeys = ["applications", "assignments", "data", "items"];

    for (const key of nestedKeys) {
      const nested = objectPayload[key];

      if (nested === undefined) {
        continue;
      }

      const nestedApplications = extractApplicationsFromResponse(nested);

      if (nestedApplications.length > 0) {
        return nestedApplications;
      }
    }
  }

  return [];
}

function extractEvaluatorsByApplicationFromProgramPayload(payload: unknown): Record<string, User[]> {
  const result: Record<string, User[]> = {};

  const inspect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== "object") {
          continue;
        }

        const applicationRecord = item as Record<string, unknown>;
        const applicationId =
          typeof applicationRecord.id === "string" && applicationRecord.id
            ? applicationRecord.id
            : null;

        if (!applicationId) {
          continue;
        }

        const assignmentList = Array.isArray(applicationRecord.evaluationAssignments)
          ? applicationRecord.evaluationAssignments
          : [];

        const evaluators = assignmentList
          .map((assignment) => {
            const directEvaluator = toUser(assignment);

            if (directEvaluator) {
              return directEvaluator;
            }

            if (!assignment || typeof assignment !== "object") {
              return null;
            }

            const assignmentRecord = assignment as Record<string, unknown>;

            return (
              toUser(assignmentRecord.evaluator) ||
              toUser(assignmentRecord.user) ||
              toUser(assignmentRecord.evaluateur)
            );
          })
          .filter((evaluator): evaluator is User => Boolean(evaluator));

        result[applicationId] = dedupeUsers(evaluators);
      }

      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const valueRecord = value as Record<string, unknown>;
    const nestedKeys = ["applications", "data", "items"];

    for (const key of nestedKeys) {
      const nested = valueRecord[key];

      if (nested === undefined) {
        continue;
      }

      inspect(nested);

      if (Object.keys(result).length > 0) {
        return;
      }
    }
  };

  inspect(payload);
  return result;
}

export function ApplicationEvaluatorProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [evaluatorsByApplicationId, setEvaluatorsByApplicationId] = useState<
    Record<string, User[]>
  >({});
  const [availableEvaluatorsByApplicationId, setAvailableEvaluatorsByApplicationId] = useState<
    Record<string, User[]>
  >({});
  const [adminApplicationsByProgramId, setAdminApplicationsByProgramId] = useState<
    Record<string, Application[]>
  >({});
  const [myAssignedApplicationsByProgramId, setMyAssignedApplicationsByProgramId] = useState<
    Record<string, Application[]>
  >({});
  const [myAssignedApplications, setMyAssignedApplications] = useState<Application[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [applicationEvaluatorsError, setApplicationEvaluatorsError] = useState<string | null>(null);

  const isApplicationEvaluatorsLoading = pendingRequests > 0;

  const clearApplicationEvaluatorsError = useCallback(() => {
    setApplicationEvaluatorsError(null);
  }, []);

  const clearApplicationEvaluatorsCache = useCallback((applicationId?: string) => {
    if (!applicationId) {
      setEvaluatorsByApplicationId({});
      return;
    }

    setEvaluatorsByApplicationId((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
  }, []);

  const clearAvailableEvaluatorsCache = useCallback((applicationId?: string) => {
    if (!applicationId) {
      setAvailableEvaluatorsByApplicationId({});
      return;
    }

    setAvailableEvaluatorsByApplicationId((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
  }, []);

  const clearAdminApplicationsByProgramCache = useCallback((programId?: string) => {
    if (!programId) {
      setAdminApplicationsByProgramId({});
      return;
    }

    setAdminApplicationsByProgramId((current) => {
      const next = { ...current };
      delete next[programId];
      return next;
    });
  }, []);

  const clearMyAssignedApplicationsByProgramCache = useCallback((programId?: string) => {
    if (!programId) {
      setMyAssignedApplicationsByProgramId({});
      return;
    }

    setMyAssignedApplicationsByProgramId((current) => {
      const next = { ...current };
      delete next[programId];
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

  const fetchApplicationEvaluators = useCallback(
    async (applicationId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `application_evaluators/${applicationId}/evaluators`,
            {},
            authToken,
          );
          const evaluators = extractUsersFromResponse(response);

          setEvaluatorsByApplicationId((current) => ({
            ...current,
            [applicationId]: evaluators,
          }));

          return evaluators;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch application evaluators";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const fetchAvailableEvaluatorsForApplication = useCallback(
    async (applicationId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `application_evaluators/${applicationId}/available-evaluators`,
            {},
            authToken,
          );
          const evaluators = extractUsersFromResponse(response);

          setAvailableEvaluatorsByApplicationId((current) => ({
            ...current,
            [applicationId]: evaluators,
          }));

          return evaluators;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch available evaluators";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const fetchApplicationsByProgramForAdmin = useCallback(
    async (programId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `application_evaluators/program/${programId}/applications`,
            {},
            authToken,
          );

          const applications = extractApplicationsFromResponse(response);
          const evaluatorsMap = extractEvaluatorsByApplicationFromProgramPayload(response);

          setAdminApplicationsByProgramId((current) => ({
            ...current,
            [programId]: applications,
          }));

          if (Object.keys(evaluatorsMap).length > 0) {
            setEvaluatorsByApplicationId((current) => ({
              ...current,
              ...evaluatorsMap,
            }));
          }

          return applications;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch program applications";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const fetchMyAssignedApplications = useCallback(async () => {
    return withLoading(async () => {
      setApplicationEvaluatorsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>("application_evaluators/me/applications", {}, authToken);
        const applications = extractApplicationsFromResponse(response);
        setMyAssignedApplications(applications);

        const grouped: Record<string, Application[]> = {};

        for (const application of applications) {
          if (!application.programId) {
            continue;
          }

          if (!grouped[application.programId]) {
            grouped[application.programId] = [];
          }

          grouped[application.programId].push(application);
        }

        setMyAssignedApplicationsByProgramId(grouped);
        return applications;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch assigned applications";
        setApplicationEvaluatorsError(message);
        throw error;
      }
    });
  }, [getRequiredToken, withLoading]);

  const fetchMyAssignedApplicationsByProgram = useCallback(
    async (programId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `application_evaluators/me/program/${programId}/applications`,
            {},
            authToken,
          );

          const applications = extractApplicationsFromResponse(response);

          setMyAssignedApplicationsByProgramId((current) => ({
            ...current,
            [programId]: applications,
          }));

          setMyAssignedApplications((current) => {
            const withoutProgram = current.filter((application) => application.programId !== programId);
            return dedupeApplications([...applications, ...withoutProgram]);
          });

          return applications;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to fetch assigned applications by program";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const assignApplicationEvaluator = useCallback(
    async (applicationId: string, evaluatorId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          await apiFetch<unknown>(
            `application_evaluators/${applicationId}/evaluators`,
            {
              method: "POST",
              body: JSON.stringify({ evaluatorId }),
            },
            authToken,
          );

          return await fetchApplicationEvaluators(applicationId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to assign evaluator to application";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [fetchApplicationEvaluators, getRequiredToken, withLoading],
  );

  const removeApplicationEvaluator = useCallback(
    async (applicationId: string, evaluatorId: string) => {
      return withLoading(async () => {
        setApplicationEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          await apiFetch<unknown>(
            `application_evaluators/${applicationId}/evaluators/${evaluatorId}`,
            {
              method: "DELETE",
            },
            authToken,
          );

          return await fetchApplicationEvaluators(applicationId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to remove evaluator from application";
          setApplicationEvaluatorsError(message);
          throw error;
        }
      });
    },
    [fetchApplicationEvaluators, getRequiredToken, withLoading],
  );

  const value = useMemo(
    () => ({
      evaluatorsByApplicationId,
      availableEvaluatorsByApplicationId,
      adminApplicationsByProgramId,
      myAssignedApplicationsByProgramId,
      myAssignedApplications,
      isApplicationEvaluatorsLoading,
      applicationEvaluatorsError,
      clearApplicationEvaluatorsError,
      clearApplicationEvaluatorsCache,
      clearAvailableEvaluatorsCache,
      clearAdminApplicationsByProgramCache,
      clearMyAssignedApplicationsByProgramCache,
      fetchApplicationEvaluators,
      fetchAvailableEvaluatorsForApplication,
      fetchApplicationsByProgramForAdmin,
      fetchMyAssignedApplications,
      fetchMyAssignedApplicationsByProgram,
      assignApplicationEvaluator,
      removeApplicationEvaluator,
    }),
    [
      evaluatorsByApplicationId,
      availableEvaluatorsByApplicationId,
      adminApplicationsByProgramId,
      myAssignedApplicationsByProgramId,
      myAssignedApplications,
      isApplicationEvaluatorsLoading,
      applicationEvaluatorsError,
      clearApplicationEvaluatorsError,
      clearApplicationEvaluatorsCache,
      clearAvailableEvaluatorsCache,
      clearAdminApplicationsByProgramCache,
      clearMyAssignedApplicationsByProgramCache,
      fetchApplicationEvaluators,
      fetchAvailableEvaluatorsForApplication,
      fetchApplicationsByProgramForAdmin,
      fetchMyAssignedApplications,
      fetchMyAssignedApplicationsByProgram,
      assignApplicationEvaluator,
      removeApplicationEvaluator,
    ],
  );

  return (
    <ApplicationEvaluatorContext.Provider value={value}>
      {children}
    </ApplicationEvaluatorContext.Provider>
  );
}

export function useApplicationEvaluators() {
  const context = useContext(ApplicationEvaluatorContext);

  if (!context) {
    throw new Error("useApplicationEvaluators must be used inside ApplicationEvaluatorProvider");
  }

  return context;
}
