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
import type { Program } from "@/src/types/program";

type CreateProgramPayload = {
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isOpen: boolean;
};

type UpdateProgramPayload = Partial<CreateProgramPayload>;

type BackendMessage = {
  message: string;
};

type ProgramContextType = {
  programs: Program[];
  publicPrograms: Program[];
  isProgramsLoading: boolean;
  programsError: string | null;
  clearProgramsError: () => void;
  fetchAllPrograms: () => Promise<Program[]>;
  fetchPublicPrograms: () => Promise<Program[]>;
  findOneProgram: (id: string) => Promise<Program>;
  createProgram: (payload: CreateProgramPayload) => Promise<Program>;
  updateProgram: (id: string, payload: UpdateProgramPayload) => Promise<Program>;
  removeProgram: (id: string) => Promise<BackendMessage>;
};

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [publicPrograms, setPublicPrograms] = useState<Program[]>([]);
  const [isProgramsLoading, setIsProgramsLoading] = useState(false);
  const [programsError, setProgramsError] = useState<string | null>(null);

  const clearProgramsError = useCallback(() => {
    setProgramsError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const upsertProgram = useCallback((updatedProgram: Program) => {
    setPrograms((current) => {
      const existingIndex = current.findIndex((program) => program.id === updatedProgram.id);

      if (existingIndex === -1) {
        return [updatedProgram, ...current];
      }

      const next = [...current];
      next[existingIndex] = updatedProgram;
      return next;
    });

    setPublicPrograms((current) => {
      const existingIndex = current.findIndex((program) => program.id === updatedProgram.id);

      if (existingIndex === -1) {
        return current;
      }

      const next = [...current];
      next[existingIndex] = updatedProgram;
      return next;
    });
  }, []);

  const fetchAllPrograms = useCallback(async () => {
    setIsProgramsLoading(true);
    setProgramsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<Program[]>("program", {}, authToken);
      setPrograms(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch programs";
      setProgramsError(message);
      throw error;
    } finally {
      setIsProgramsLoading(false);
    }
  }, [getRequiredToken]);

  const fetchPublicPrograms = useCallback(async () => {
    setIsProgramsLoading(true);
    setProgramsError(null);

    try {
      const data = await apiFetch<Program[]>("program/public", {});
      setPublicPrograms(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch public programs";
      setProgramsError(message);
      throw error;
    } finally {
      setIsProgramsLoading(false);
    }
  }, []);

  const findOneProgram = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const program = await apiFetch<Program>(`program/${id}`, {}, authToken);
      upsertProgram(program);
      return program;
    },
    [getRequiredToken, upsertProgram],
  );

  const createProgram = useCallback(
    async (payload: CreateProgramPayload) => {
      const authToken = getRequiredToken();
      const createdProgram = await apiFetch<Program>(
        "program",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertProgram(createdProgram);
      return createdProgram;
    },
    [getRequiredToken, upsertProgram],
  );

  const updateProgram = useCallback(
    async (id: string, payload: UpdateProgramPayload) => {
      const authToken = getRequiredToken();
      const updatedProgram = await apiFetch<Program>(
        `program/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertProgram(updatedProgram);
      return updatedProgram;
    },
    [getRequiredToken, upsertProgram],
  );

  const removeProgram = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const result = await apiFetch<BackendMessage>(
        `program/${id}`,
        {
          method: "DELETE",
        },
        authToken,
      );

      setPrograms((current) => current.filter((program) => program.id !== id));
      setPublicPrograms((current) => current.filter((program) => program.id !== id));

      return result;
    },
    [getRequiredToken],
  );

  const value = useMemo(
    () => ({
      programs,
      publicPrograms,
      isProgramsLoading,
      programsError,
      clearProgramsError,
      fetchAllPrograms,
      fetchPublicPrograms,
      findOneProgram,
      createProgram,
      updateProgram,
      removeProgram,
    }),
    [
      programs,
      publicPrograms,
      isProgramsLoading,
      programsError,
      clearProgramsError,
      fetchAllPrograms,
      fetchPublicPrograms,
      findOneProgram,
      createProgram,
      updateProgram,
      removeProgram,
    ],
  );

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function usePrograms() {
  const context = useContext(ProgramContext);

  if (!context) {
    throw new Error("usePrograms must be used inside ProgramProvider");
  }

  return context;
}
