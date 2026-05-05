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
import type { UserRole } from "@/src/types/auth";
import type { Program } from "@/src/types/program";
import type { User } from "@/src/types/user";

type ProgramEvaluatorContextType = {
  evaluatorsByProgramId: Record<string, User[]>;
  myPrograms: Program[];
  isProgramEvaluatorsLoading: boolean;
  programEvaluatorsError: string | null;
  clearProgramEvaluatorsError: () => void;
  clearProgramEvaluatorsCache: (programId?: string) => void;
  fetchProgramEvaluators: (programId: string) => Promise<User[]>;
  fetchMyPrograms: () => Promise<Program[]>;
  assignProgramEvaluator: (programId: string, evaluatorId: string) => Promise<User[]>;
  removeProgramEvaluator: (programId: string, evaluatorId: string) => Promise<User[]>;
};

const ProgramEvaluatorContext = createContext<ProgramEvaluatorContextType | undefined>(undefined);

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

function toProgram(candidate: unknown): Program | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;

  const id = typeof record.id === "string" ? record.id : null;
  const title = typeof record.title === "string" ? record.title : null;
  const description = typeof record.description === "string" ? record.description : null;
  const openDate = typeof record.openDate === "string" ? record.openDate : null;
  const closeDate = typeof record.closeDate === "string" ? record.closeDate : null;
  const isOpen =
    typeof record.isOpen === "boolean"
      ? record.isOpen
      : typeof record.isopen === "boolean"
        ? record.isopen
        : null;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : null;
  const updatedAt =
    typeof record.updatedAt === "string"
      ? record.updatedAt
      : typeof record.updated_at === "string"
        ? record.updated_at
        : createdAt;

  if (!id || !title || !description || !openDate || !closeDate || isOpen === null || !createdAt) {
    return null;
  }

  return {
    id,
    title,
    description,
    openDate,
    closeDate,
    isOpen,
    createdAt,
    updatedAt: updatedAt || createdAt,
  };
}

function dedupePrograms(programs: Program[]): Program[] {
  const map = new Map<string, Program>();

  for (const program of programs) {
    if (!map.has(program.id)) {
      map.set(program.id, program);
    }
  }

  return [...map.values()];
}

function extractProgramsFromResponse(payload: unknown): Program[] {
  if (Array.isArray(payload)) {
    const programs = payload
      .map((item) => {
        const directProgram = toProgram(item);

        if (directProgram) {
          return directProgram;
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const itemRecord = item as Record<string, unknown>;

        return (
          toProgram(itemRecord.program) ||
          toProgram(itemRecord.programme)
        );
      })
      .filter((program): program is Program => Boolean(program));

    return dedupePrograms(programs);
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as Record<string, unknown>;

    const directProgram = toProgram(objectPayload);

    if (directProgram) {
      return [directProgram];
    }

    const nestedKeys = ["programs", "programmes", "assignments", "data", "items"];

    for (const key of nestedKeys) {
      const nested = objectPayload[key];

      if (nested === undefined) {
        continue;
      }

      const nestedPrograms = extractProgramsFromResponse(nested);

      if (nestedPrograms.length > 0) {
        return nestedPrograms;
      }
    }
  }

  return [];
}

export function ProgramEvaluatorProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [evaluatorsByProgramId, setEvaluatorsByProgramId] = useState<Record<string, User[]>>({});
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [programEvaluatorsError, setProgramEvaluatorsError] = useState<string | null>(null);

  const isProgramEvaluatorsLoading = pendingRequests > 0;

  const clearProgramEvaluatorsError = useCallback(() => {
    setProgramEvaluatorsError(null);
  }, []);

  const clearProgramEvaluatorsCache = useCallback((programId?: string) => {
    if (!programId) {
      setEvaluatorsByProgramId({});
      return;
    }

    setEvaluatorsByProgramId((current) => {
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

  const fetchProgramEvaluators = useCallback(
    async (programId: string) => {
      return withLoading(async () => {
        setProgramEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          const response = await apiFetch<unknown>(
            `program_evaluators/${programId}/evaluators`,
            {},
            authToken,
          );
          const evaluators = extractUsersFromResponse(response);

          setEvaluatorsByProgramId((current) => ({
            ...current,
            [programId]: evaluators,
          }));

          return evaluators;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to fetch program evaluators";
          setProgramEvaluatorsError(message);
          throw error;
        }
      });
    },
    [getRequiredToken, withLoading],
  );

  const fetchMyPrograms = useCallback(async () => {
    return withLoading(async () => {
      setProgramEvaluatorsError(null);
      const authToken = getRequiredToken();

      try {
        const response = await apiFetch<unknown>("program_evaluators/me/programs", {}, authToken);
        const programs = extractProgramsFromResponse(response);
        setMyPrograms(programs);
        return programs;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch evaluator programs";
        setProgramEvaluatorsError(message);
        throw error;
      }
    });
  }, [getRequiredToken, withLoading]);

  const assignProgramEvaluator = useCallback(
    async (programId: string, evaluatorId: string) => {
      return withLoading(async () => {
        setProgramEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          await apiFetch<unknown>(
            `program_evaluators/${programId}/evaluators`,
            {
              method: "POST",
              body: JSON.stringify({ evaluatorId }),
            },
            authToken,
          );

          return await fetchProgramEvaluators(programId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to assign evaluator to program";
          setProgramEvaluatorsError(message);
          throw error;
        }
      });
    },
    [fetchProgramEvaluators, getRequiredToken, withLoading],
  );

  const removeProgramEvaluator = useCallback(
    async (programId: string, evaluatorId: string) => {
      return withLoading(async () => {
        setProgramEvaluatorsError(null);
        const authToken = getRequiredToken();

        try {
          await apiFetch<unknown>(
            `program_evaluators/${programId}/evaluators/${evaluatorId}`,
            {
              method: "DELETE",
            },
            authToken,
          );

          return await fetchProgramEvaluators(programId);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to remove evaluator from program";
          setProgramEvaluatorsError(message);
          throw error;
        }
      });
    },
    [fetchProgramEvaluators, getRequiredToken, withLoading],
  );

  const value = useMemo(
    () => ({
      evaluatorsByProgramId,
      myPrograms,
      isProgramEvaluatorsLoading,
      programEvaluatorsError,
      clearProgramEvaluatorsError,
      clearProgramEvaluatorsCache,
      fetchProgramEvaluators,
      fetchMyPrograms,
      assignProgramEvaluator,
      removeProgramEvaluator,
    }),
    [
      evaluatorsByProgramId,
      myPrograms,
      isProgramEvaluatorsLoading,
      programEvaluatorsError,
      clearProgramEvaluatorsError,
      clearProgramEvaluatorsCache,
      fetchProgramEvaluators,
      fetchMyPrograms,
      assignProgramEvaluator,
      removeProgramEvaluator,
    ],
  );

  return (
    <ProgramEvaluatorContext.Provider value={value}>
      {children}
    </ProgramEvaluatorContext.Provider>
  );
}

export function useProgramEvaluators() {
  const context = useContext(ProgramEvaluatorContext);

  if (!context) {
    throw new Error("useProgramEvaluators must be used inside ProgramEvaluatorProvider");
  }

  return context;
}
