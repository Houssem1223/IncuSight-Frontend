"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Application } from "@/src/types/application";

type CreateApplicationPayload = {
  startupId: string;
  programId: string;
  motivationLetter: string;
  [key: string]: unknown;
};

type UpdateApplicationPayload = {
  status?: string;
  [key: string]: unknown;
};

type BackendMessage = {
  message: string;
};

type ApplicationContextType = {
  applications: Application[];
  myApplications: Application[];
  isApplicationsLoading: boolean;
  applicationsError: string | null;
  clearApplicationsError: () => void;
  fetchAllApplications: () => Promise<Application[]>;
  fetchMyApplications: () => Promise<Application[]>;
  findOneApplication: (id: string) => Promise<Application>;
  findOneMyApplication: (id: string) => Promise<Application>;
  createApplication: (payload: CreateApplicationPayload) => Promise<Application>;
  removeMyApplication: (id: string) => Promise<BackendMessage | Application>;
  updateApplicationStatus: (id: string, payload: UpdateApplicationPayload) => Promise<Application>;
};

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  useEffect(() => {
    setApplications([]);
    setMyApplications([]);
    setApplicationsError(null);
    setIsApplicationsLoading(false);
  }, [user?.id]);

  const clearApplicationsError = useCallback(() => {
    setApplicationsError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const upsertInList = useCallback((current: Application[], updated: Application) => {
    const existingIndex = current.findIndex((application) => application.id === updated.id);

    if (existingIndex === -1) {
      return [updated, ...current];
    }

    const next = [...current];
    next[existingIndex] = updated;
    return next;
  }, []);

  const upsertApplication = useCallback(
    (updated: Application) => {
      setApplications((current) => upsertInList(current, updated));
    },
    [upsertInList],
  );

  const upsertMyApplication = useCallback(
    (updated: Application) => {
      setMyApplications((current) => upsertInList(current, updated));
    },
    [upsertInList],
  );

  const fetchAllApplications = useCallback(async () => {
    setIsApplicationsLoading(true);
    setApplicationsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<Application[]>("application", {}, authToken);
      setApplications(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch applications";
      setApplicationsError(message);
      throw error;
    } finally {
      setIsApplicationsLoading(false);
    }
  }, [getRequiredToken]);

  const fetchMyApplications = useCallback(async () => {
    setIsApplicationsLoading(true);
    setApplicationsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<Application[]>("application/me", {}, authToken);
      setMyApplications(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch your applications";
      setApplicationsError(message);
      throw error;
    } finally {
      setIsApplicationsLoading(false);
    }
  }, [getRequiredToken]);

  const findOneApplication = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const data = await apiFetch<Application>(`application/${id}`, {}, authToken);
      upsertApplication(data);
      return data;
    },
    [getRequiredToken, upsertApplication],
  );

  const findOneMyApplication = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const data = await apiFetch<Application>(`application/me/${id}`, {}, authToken);
      upsertMyApplication(data);
      return data;
    },
    [getRequiredToken, upsertMyApplication],
  );

  const createApplication = useCallback(
    async (payload: CreateApplicationPayload) => {
      const authToken = getRequiredToken();
      const created = await apiFetch<Application>(
        "application",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertMyApplication(created);
      upsertApplication(created);
      return created;
    },
    [getRequiredToken, upsertApplication, upsertMyApplication],
  );

  const removeMyApplication = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const result = await apiFetch<BackendMessage | Application>(
        `application/me/${id}`,
        {
          method: "DELETE",
        },
        authToken,
      );

      setMyApplications((current) => current.filter((application) => application.id !== id));
      setApplications((current) => current.filter((application) => application.id !== id));

      return result;
    },
    [getRequiredToken],
  );

  const updateApplicationStatus = useCallback(
    async (id: string, payload: UpdateApplicationPayload) => {
      const authToken = getRequiredToken();
      const updated = await apiFetch<Application>(
        `application/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertApplication(updated);
      setMyApplications((current) => {
        const existsInMine = current.some((application) => application.id === updated.id);

        if (!existsInMine) {
          return current;
        }

        return upsertInList(current, updated);
      });
      return updated;
    },
    [getRequiredToken, upsertApplication, upsertInList],
  );

  const value = useMemo(
    () => ({
      applications,
      myApplications,
      isApplicationsLoading,
      applicationsError,
      clearApplicationsError,
      fetchAllApplications,
      fetchMyApplications,
      findOneApplication,
      findOneMyApplication,
      createApplication,
      removeMyApplication,
      updateApplicationStatus,
    }),
    [
      applications,
      myApplications,
      isApplicationsLoading,
      applicationsError,
      clearApplicationsError,
      fetchAllApplications,
      fetchMyApplications,
      findOneApplication,
      findOneMyApplication,
      createApplication,
      removeMyApplication,
      updateApplicationStatus,
    ],
  );

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplications() {
  const context = useContext(ApplicationContext);

  if (!context) {
    throw new Error("useApplications must be used inside ApplicationProvider");
  }

  return context;
}
