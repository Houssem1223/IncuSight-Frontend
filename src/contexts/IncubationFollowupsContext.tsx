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
import type {
  CreateFollowUpObjectivePayload,
  CreateFollowUpUpdatePayload,
  FollowUpObjective,
  FollowUpUpdate,
  IncubationFollowUp,
  UpdateFollowUpObjectivePayload,
  UpdateFollowUpObjectiveProgressPayload,
} from "@/src/types/incubation-followups";

type IncubationFollowupsContextType = {
  followUps: IncubationFollowUp[];
  myFollowUps: IncubationFollowUp[];
  isFollowUpsLoading: boolean;
  followUpsError: string | null;
  clearFollowUpsError: () => void;
  fetchAllFollowUps: () => Promise<IncubationFollowUp[]>;
  fetchMyFollowUps: () => Promise<IncubationFollowUp[]>;
  findOneFollowUp: (id: string) => Promise<IncubationFollowUp>;
  createFromApplication: (applicationId: string) => Promise<IncubationFollowUp>;
  addObjective: (followUpId: string, payload: CreateFollowUpObjectivePayload) => Promise<FollowUpObjective>;
  updateObjectiveByAdmin: (
    objectiveId: string,
    payload: UpdateFollowUpObjectivePayload,
  ) => Promise<FollowUpObjective>;
  updateObjectiveByStartup: (
    objectiveId: string,
    payload: UpdateFollowUpObjectiveProgressPayload,
  ) => Promise<FollowUpObjective>;
  addUpdate: (followUpId: string, payload: CreateFollowUpUpdatePayload) => Promise<FollowUpUpdate>;
};

const IncubationFollowupsContext = createContext<IncubationFollowupsContextType | undefined>(undefined);

function upsertInList(current: IncubationFollowUp[], updated: IncubationFollowUp) {
  const existingIndex = current.findIndex((followUp) => followUp.id === updated.id);

  if (existingIndex === -1) {
    return [updated, ...current];
  }

  const next = [...current];
  next[existingIndex] = updated;
  return next;
}

function upsertObjectiveInFollowUp(
  followUps: IncubationFollowUp[],
  followUpId: string,
  objective: FollowUpObjective,
) {
  return followUps.map((followUp) => {
    if (followUp.id !== followUpId) {
      return followUp;
    }

    const objectives = followUp.objectives || [];
    const existingIndex = objectives.findIndex((item) => item.id === objective.id);

    if (existingIndex === -1) {
      return {
        ...followUp,
        objectives: [objective, ...objectives],
      };
    }

    const nextObjectives = [...objectives];
    nextObjectives[existingIndex] = objective;

    return {
      ...followUp,
      objectives: nextObjectives,
    };
  });
}

function upsertUpdateInFollowUp(
  followUps: IncubationFollowUp[],
  followUpId: string,
  update: FollowUpUpdate,
) {
  return followUps.map((followUp) => {
    if (followUp.id !== followUpId) {
      return followUp;
    }

    const updates = followUp.updates || [];
    const existingIndex = updates.findIndex((item) => item.id === update.id);

    if (existingIndex === -1) {
      return {
        ...followUp,
        updates: [update, ...updates],
      };
    }

    const nextUpdates = [...updates];
    nextUpdates[existingIndex] = update;

    return {
      ...followUp,
      updates: nextUpdates,
    };
  });
}

export function IncubationFollowupsProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [followUps, setFollowUps] = useState<IncubationFollowUp[]>([]);
  const [myFollowUps, setMyFollowUps] = useState<IncubationFollowUp[]>([]);
  const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState<string | null>(null);

  useEffect(() => {
    setFollowUps([]);
    setMyFollowUps([]);
    setFollowUpsError(null);
    setIsFollowUpsLoading(false);
  }, [user?.id]);

  const clearFollowUpsError = useCallback(() => {
    setFollowUpsError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const upsertFollowUp = useCallback(
    (updatedFollowUp: IncubationFollowUp) => {
      setFollowUps((current) => upsertInList(current, updatedFollowUp));

      if (user?.role === "STARTUP") {
        setMyFollowUps((current) => upsertInList(current, updatedFollowUp));
      }
    },
    [user?.role],
  );

  const fetchAllFollowUps = useCallback(async () => {
    setIsFollowUpsLoading(true);
    setFollowUpsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<IncubationFollowUp[]>("incubation-followups", {}, authToken);
      setFollowUps(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch follow-ups";
      setFollowUpsError(message);
      throw error;
    } finally {
      setIsFollowUpsLoading(false);
    }
  }, [getRequiredToken]);

  const fetchMyFollowUps = useCallback(async () => {
    setIsFollowUpsLoading(true);
    setFollowUpsError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetch<IncubationFollowUp[]>("incubation-followups/my", {}, authToken);
      setMyFollowUps(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch your follow-ups";
      setFollowUpsError(message);
      throw error;
    } finally {
      setIsFollowUpsLoading(false);
    }
  }, [getRequiredToken]);

  const findOneFollowUp = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const followUp = await apiFetch<IncubationFollowUp>(`incubation-followups/${id}`, {}, authToken);
      upsertFollowUp(followUp);
      return followUp;
    },
    [getRequiredToken, upsertFollowUp],
  );

  const createFromApplication = useCallback(
    async (applicationId: string) => {
      const authToken = getRequiredToken();
      const followUp = await apiFetch<IncubationFollowUp>(
        `incubation-followups/application/${applicationId}`,
        {
          method: "POST",
        },
        authToken,
      );

      upsertFollowUp(followUp);
      return followUp;
    },
    [getRequiredToken, upsertFollowUp],
  );

  const addObjective = useCallback(
    async (followUpId: string, payload: CreateFollowUpObjectivePayload) => {
      const authToken = getRequiredToken();
      const objective = await apiFetch<FollowUpObjective>(
        `incubation-followups/${followUpId}/objectives`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setFollowUps((current) => upsertObjectiveInFollowUp(current, followUpId, objective));
      setMyFollowUps((current) => upsertObjectiveInFollowUp(current, followUpId, objective));
      return objective;
    },
    [getRequiredToken],
  );

  const updateObjectiveByAdmin = useCallback(
    async (objectiveId: string, payload: UpdateFollowUpObjectivePayload) => {
      const authToken = getRequiredToken();
      const objective = await apiFetch<FollowUpObjective>(
        `incubation-followups/objectivesAdmin/${objectiveId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setFollowUps((current) =>
        current.map((followUp) => ({
          ...followUp,
          objectives: (followUp.objectives || []).map((item) =>
            item.id === objective.id ? objective : item,
          ),
        })),
      );
      setMyFollowUps((current) =>
        current.map((followUp) => ({
          ...followUp,
          objectives: (followUp.objectives || []).map((item) =>
            item.id === objective.id ? objective : item,
          ),
        })),
      );

      return objective;
    },
    [getRequiredToken],
  );

  const updateObjectiveByStartup = useCallback(
    async (objectiveId: string, payload: UpdateFollowUpObjectivePayload) => {
      const authToken = getRequiredToken();
      const objective = await apiFetch<FollowUpObjective>(
        `incubation-followups/objectives/${objectiveId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setFollowUps((current) =>
        current.map((followUp) => ({
          ...followUp,
          objectives: (followUp.objectives || []).map((item) =>
            item.id === objective.id ? objective : item,
          ),
        })),
      );
      setMyFollowUps((current) =>
        current.map((followUp) => ({
          ...followUp,
          objectives: (followUp.objectives || []).map((item) =>
            item.id === objective.id ? objective : item,
          ),
        })),
      );

      return objective;
    },
    [getRequiredToken],
  );

  const addUpdate = useCallback(
    async (followUpId: string, payload: CreateFollowUpUpdatePayload) => {
      const authToken = getRequiredToken();
      const update = await apiFetch<FollowUpUpdate>(
        `incubation-followups/${followUpId}/updates`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      setFollowUps((current) => upsertUpdateInFollowUp(current, followUpId, update));
      setMyFollowUps((current) => upsertUpdateInFollowUp(current, followUpId, update));
      return update;
    },
    [getRequiredToken],
  );

  const value = useMemo(
    () => ({
      followUps,
      myFollowUps,
      isFollowUpsLoading,
      followUpsError,
      clearFollowUpsError,
      fetchAllFollowUps,
      fetchMyFollowUps,
      findOneFollowUp,
      createFromApplication,
      addObjective,
      updateObjectiveByAdmin,
      updateObjectiveByStartup,
      addUpdate,
    }),
    [
      followUps,
      myFollowUps,
      isFollowUpsLoading,
      followUpsError,
      clearFollowUpsError,
      fetchAllFollowUps,
      fetchMyFollowUps,
      findOneFollowUp,
      createFromApplication,
      addObjective,
      updateObjectiveByAdmin,
      updateObjectiveByStartup,
      addUpdate,
    ],
  );

  return <IncubationFollowupsContext.Provider value={value}>{children}</IncubationFollowupsContext.Provider>;
}

export function useIncubationFollowups() {
  const context = useContext(IncubationFollowupsContext);

  if (!context) {
    throw new Error("useIncubationFollowups must be used inside IncubationFollowupsProvider");
  }

  return context;
}
