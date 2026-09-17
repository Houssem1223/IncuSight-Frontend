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
import { apiFetch, apiFetchWithTotal } from "@/src/lib/api";
import {
  buildApplicationListPath,
  type ApplicationListQuery,
} from "@/src/lib/application-query";
import { useAuth } from "@/src/contexts/AuthContext";
import type { Application, Decision } from "@/src/types/application";

type CreateApplicationPayload = {
  startupId: string;
  programId: string;
  motivationLetter: string;
  [key: string]: unknown;
};

type MakeDecisionPayload = {
  status: string;
  comment?: string;
};

// Le motif est obligatoire cote backend : une decision rendue ne se change pas
// sans justification tracee (table DecisionRevision).
type ReviseDecisionPayload = {
  status: string;
  reason: string;
};

type MakeDecisionResult = {
  application: Application;
  decision: Decision;
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
  applicationsTotal: number | null;
  fetchAllApplications: (query?: ApplicationListQuery) => Promise<Application[]>;
  fetchMyApplications: () => Promise<Application[]>;
  createApplication: (payload: CreateApplicationPayload) => Promise<Application>;
  removeMyApplication: (id: string) => Promise<BackendMessage | Application>;
  makeDecision: (id: string, payload: MakeDecisionPayload) => Promise<MakeDecisionResult>;
  reviseDecision: (id: string, payload: ReviseDecisionPayload) => Promise<void>;
};

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [applicationsTotal, setApplicationsTotal] = useState<number | null>(null);

  useEffect(() => {
    setApplications([]);
    setMyApplications([]);
    setApplicationsError(null);
    setApplicationsTotal(null);
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

  const fetchAllApplications = useCallback(async (query?: ApplicationListQuery) => {
    setIsApplicationsLoading(true);
    setApplicationsError(null);

    try {
      const authToken = getRequiredToken();
      const { data, total } = await apiFetchWithTotal<Application[]>(
        buildApplicationListPath(query),
        {},
        authToken,
      );
      setApplications(data);
      // Sans page/limit le backend renvoie tout : le total vaut alors la longueur
      // de la liste, et l'en-tete reste la source de verite des que l'on pagine.
      setApplicationsTotal(total ?? data.length);
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

  const makeDecision = useCallback(
    async (id: string, payload: MakeDecisionPayload) => {
      const authToken = getRequiredToken();
      const result = await apiFetch<MakeDecisionResult>(
        `application/${id}/decision`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      const updatedApplication = {
        ...result.application,
        decision: result.application.decision ?? result.decision,
      };

      upsertApplication(updatedApplication);
      setMyApplications((current) => {
        const existsInMine = current.some((application) => application.id === updatedApplication.id);

        if (!existsInMine) {
          return current;
        }

        return upsertInList(current, updatedApplication);
      });

      return {
        application: updatedApplication,
        decision: result.decision,
      };
    },
    [getRequiredToken, upsertApplication, upsertInList],
  );

  // La route de revision renvoie la Decision mise a jour, pas la candidature :
  // on recharge la liste plutot que de recomposer un etat partiel a la main.
  const reviseDecision = useCallback(
    async (id: string, payload: ReviseDecisionPayload) => {
      const authToken = getRequiredToken();

      await apiFetch<unknown>(
        `application/${id}/decision/revise`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      await fetchAllApplications();
    },
    [fetchAllApplications, getRequiredToken],
  );

  const value = useMemo(
    () => ({
      applications,
      applicationsTotal,
      myApplications,
      isApplicationsLoading,
      applicationsError,
      clearApplicationsError,
      fetchAllApplications,
      fetchMyApplications,
      createApplication,
      removeMyApplication,
      makeDecision,
      reviseDecision,
    }),
    [
      applications,
      applicationsTotal,
      myApplications,
      isApplicationsLoading,
      applicationsError,
      clearApplicationsError,
      fetchAllApplications,
      fetchMyApplications,
      createApplication,
      removeMyApplication,
      makeDecision,
      reviseDecision,
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
