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
import type { Startup } from "@/src/types/startup";

type CreateStartupPayload = {
  startupName: string;
  description?: string;
  sector?: string;
  stage?: string;
  website?: string;
};

type UpdateStartupPayload = Partial<CreateStartupPayload>;

type BackendMessage = {
  message: string;
};

type StartupContextType = {
  startups: Startup[];
  myStartup: Startup | null;
  isStartupsLoading: boolean;
  startupsError: string | null;
  clearStartupsError: () => void;
  fetchAllStartups: () => Promise<Startup[]>;
  fetchMyStartup: () => Promise<Startup | null>;
  findOneStartup: (id: string) => Promise<Startup>;
  createStartup: (payload: CreateStartupPayload) => Promise<Startup>;
  updateMyStartup: (payload: UpdateStartupPayload) => Promise<Startup>;
  removeMyStartup: () => Promise<BackendMessage>;
};

const StartupContext = createContext<StartupContextType | undefined>(undefined);

function isNotFoundLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("introuvable") ||
    message.includes("no startup") ||
    message.includes("cannot get /startup/me")
  );
}

export function StartupProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [myStartup, setMyStartup] = useState<Startup | null>(null);
  const [isStartupsLoading, setIsStartupsLoading] = useState(false);
  const [startupsError, setStartupsError] = useState<string | null>(null);

  const clearStartupsError = useCallback(() => {
    setStartupsError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const upsertStartup = useCallback((updatedStartup: Startup) => {
    setStartups((current) => {
      const existingIndex = current.findIndex((startup) => startup.id === updatedStartup.id);

      if (existingIndex === -1) {
        return [updatedStartup, ...current];
      }

      const next = [...current];
      next[existingIndex] = updatedStartup;
      return next;
    });
  }, []);

  const fetchAllStartups = useCallback(async () => {
    setIsStartupsLoading(true);
    setStartupsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<Startup[]>("startup", {}, authToken);
      setStartups(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch startups";
      setStartupsError(message);
      throw error;
    } finally {
      setIsStartupsLoading(false);
    }
  }, [getRequiredToken]);

  const fetchMyStartup = useCallback(async () => {
    setIsStartupsLoading(true);
    setStartupsError(null);

    try {
      const authToken = getRequiredToken();
      const startup = await apiFetch<Startup>("startup/me", {}, authToken);
      setMyStartup(startup);
      upsertStartup(startup);
      return startup;
    } catch (error) {
      if (isNotFoundLikeError(error)) {
        setMyStartup(null);
        setStartupsError(null);
        return null;
      }

      const message = error instanceof Error ? error.message : "Failed to fetch startup";
      setStartupsError(message);
      throw error;
    } finally {
      setIsStartupsLoading(false);
    }
  }, [getRequiredToken, upsertStartup]);

  const findOneStartup = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const startup = await apiFetch<Startup>(`startup/${id}`, {}, authToken);
      upsertStartup(startup);
      return startup;
    },
    [getRequiredToken, upsertStartup],
  );

  const createStartup = useCallback(
    async (payload: CreateStartupPayload) => {
      const authToken = getRequiredToken();
      const startup = await apiFetch<Startup>(
        "startup",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setMyStartup(startup);
      upsertStartup(startup);
      return startup;
    },
    [getRequiredToken, upsertStartup],
  );

  const updateMyStartup = useCallback(
    async (payload: UpdateStartupPayload) => {
      const authToken = getRequiredToken();
      const startup = await apiFetch<Startup>(
        "startup/me",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setMyStartup(startup);
      upsertStartup(startup);
      return startup;
    },
    [getRequiredToken, upsertStartup],
  );

  const removeMyStartup = useCallback(async () => {
    const authToken = getRequiredToken();
    const previousId = myStartup?.id;

    const result = await apiFetch<BackendMessage>(
      "startup/me",
      {
        method: "DELETE",
      },
      authToken,
    );

    setMyStartup(null);

    if (previousId) {
      setStartups((current) => current.filter((startup) => startup.id !== previousId));
    }

    return result;
  }, [getRequiredToken, myStartup?.id]);

  const value = useMemo(
    () => ({
      startups,
      myStartup,
      isStartupsLoading,
      startupsError,
      clearStartupsError,
      fetchAllStartups,
      fetchMyStartup,
      findOneStartup,
      createStartup,
      updateMyStartup,
      removeMyStartup,
    }),
    [
      startups,
      myStartup,
      isStartupsLoading,
      startupsError,
      clearStartupsError,
      fetchAllStartups,
      fetchMyStartup,
      findOneStartup,
      createStartup,
      updateMyStartup,
      removeMyStartup,
    ],
  );

  return <StartupContext.Provider value={value}>{children}</StartupContext.Provider>;
}

export function useStartups() {
  const context = useContext(StartupContext);

  if (!context) {
    throw new Error("useStartups must be used inside StartupProvider");
  }

  return context;
}
