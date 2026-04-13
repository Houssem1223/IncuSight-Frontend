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
  myStartups: Startup[];
  myStartup: Startup | null;
  isStartupsLoading: boolean;
  startupsError: string | null;
  clearStartupsError: () => void;
  fetchAllStartups: () => Promise<Startup[]>;
  fetchMyStartups: () => Promise<Startup[]>;
  findOneStartup: (id: string) => Promise<Startup>;
  createStartup: (payload: CreateStartupPayload) => Promise<Startup>;
  updateMyStartup: (startupId: string, payload: UpdateStartupPayload) => Promise<Startup>;
  removeMyStartup: (startupId: string) => Promise<BackendMessage>;
};

const StartupContext = createContext<StartupContextType | undefined>(undefined);

export function StartupProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [myStartups, setMyStartups] = useState<Startup[]>([]);
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

  const upsertMyStartup = useCallback(
    (updatedStartup: Startup) => {
      setMyStartups((current) => {
        const existingIndex = current.findIndex((startup) => startup.id === updatedStartup.id);

        if (existingIndex === -1) {
          return [updatedStartup, ...current];
        }

        const next = [...current];
        next[existingIndex] = updatedStartup;
        return next;
      });

      upsertStartup(updatedStartup);
    },
    [upsertStartup],
  );

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

  const fetchMyStartups = useCallback(async () => {
    setIsStartupsLoading(true);
    setStartupsError(null);

    try {
      const authToken = getRequiredToken();
      const ownedStartups = await apiFetch<Startup[]>("startup/me", {}, authToken);

      setMyStartups(ownedStartups);
      setStartups((current) => {
        const ownedIds = new Set(ownedStartups.map((startup) => startup.id));
        const others = current.filter((startup) => !ownedIds.has(startup.id));
        return [...ownedStartups, ...others];
      });

      return ownedStartups;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch your startups";
      setStartupsError(message);
      throw error;
    } finally {
      setIsStartupsLoading(false);
    }
  }, [getRequiredToken]);

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

      upsertMyStartup(startup);
      return startup;
    },
    [getRequiredToken, upsertMyStartup],
  );

  const updateMyStartup = useCallback(
    async (startupId: string, payload: UpdateStartupPayload) => {
      const authToken = getRequiredToken();
      const startup = await apiFetch<Startup>(
        `startup/${startupId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertMyStartup(startup);
      return startup;
    },
    [getRequiredToken, upsertMyStartup],
  );

  const removeMyStartup = useCallback(async (startupId: string) => {
    const authToken = getRequiredToken();

    const result = await apiFetch<BackendMessage>(
      `startup/${startupId}`,
      {
        method: "DELETE",
      },
      authToken,
    );

    setMyStartups((current) => current.filter((startup) => startup.id !== startupId));
    setStartups((current) => current.filter((startup) => startup.id !== startupId));

    return result;
  }, [getRequiredToken]);

  const myStartup = myStartups[0] ?? null;

  const value = useMemo(
    () => ({
      startups,
      myStartups,
      myStartup,
      isStartupsLoading,
      startupsError,
      clearStartupsError,
      fetchAllStartups,
      fetchMyStartups,
      findOneStartup,
      createStartup,
      updateMyStartup,
      removeMyStartup,
    }),
    [
      startups,
      myStartups,
      myStartup,
      isStartupsLoading,
      startupsError,
      clearStartupsError,
      fetchAllStartups,
      fetchMyStartups,
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
