"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { Button } from "@/src/components/ui/button";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import type {
  FollowUpObjective,
  FollowUpStatus,
} from "@/src/types/incubation-followups";
import FollowUpOverview from "./followups/FollowUpOverview";
import FollowUpsList from "./followups/FollowUpsList";
import {
  clampProgress,
  emptyObjectiveForm,
  getApplicationLabel,
  toDateInputValue,
  type ObjectiveFormState,
} from "./followups/followupHelpers";
import ObjectiveModal from "./followups/ObjectiveModal";
import ObjectivesSection from "./followups/ObjectivesSection";
import StartFollowUpPanel from "./followups/StartFollowUpPanel";
import SummaryCards from "./followups/SummaryCards";
import UpdatesTimeline from "./followups/UpdatesTimeline";

export default function AdminIncubationFollowupsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    applications,
    isApplicationsLoading,
    applicationsError,
    clearApplicationsError,
    fetchAllApplications,
  } = useApplications();
  const {
    followUps,
    isFollowUpsLoading,
    followUpsError,
    clearFollowUpsError,
    fetchAllFollowUps,
    createFromApplication,
    addObjective,
    updateObjectiveByAdmin,
  } = useIncubationFollowups();

  const [selectedFollowUpId, setSelectedFollowUpId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FollowUpStatus>("ALL");
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<FollowUpObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormState>(emptyObjectiveForm);
  const [isSavingObjective, setIsSavingObjective] = useState(false);
  const [actionError, setActionError] = useState("");

  const refresh = useCallback(async () => {
    clearApplicationsError();
    clearFollowUpsError();
    setActionError("");

    await Promise.all([fetchAllApplications(), fetchAllFollowUps()]);
  }, [
    clearApplicationsError,
    clearFollowUpsError,
    fetchAllApplications,
    fetchAllFollowUps,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refresh().catch(() => {
    });
  }, [isAuthReady, isAuthenticated, refresh]);

  const sortedFollowUps = useMemo(
    () =>
      [...followUps].sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();
        return rightDate - leftDate;
      }),
    [followUps],
  );

  const filteredFollowUps = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("fr");

    return sortedFollowUps.filter((followUp) => {
      const status = followUp.status || "ACTIVE";

      if (statusFilter !== "ALL" && status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        followUp.startup?.startupName,
        followUp.program?.title,
        followUp.applicationId,
        followUp.startupId,
      ].some((value) => value?.toLocaleLowerCase("fr").includes(normalizedQuery));
    });
  }, [searchQuery, sortedFollowUps, statusFilter]);

  const activeFollowUpId = useMemo(() => {
    if (filteredFollowUps.some((followUp) => followUp.id === selectedFollowUpId)) {
      return selectedFollowUpId;
    }

    return filteredFollowUps[0]?.id || "";
  }, [filteredFollowUps, selectedFollowUpId]);

  const activeFollowUp = useMemo(
    () => followUps.find((followUp) => followUp.id === activeFollowUpId) || null,
    [activeFollowUpId, followUps],
  );

  const trackedApplicationIds = useMemo(
    () => new Set(followUps.map((followUp) => followUp.applicationId)),
    [followUps],
  );

  const availableApplications = useMemo(
    () =>
      applications
        .filter(
          (application) =>
            (application.status || "").toUpperCase() === "ACCEPTED" &&
            !trackedApplicationIds.has(application.id),
        )
        .sort((left, right) => getApplicationLabel(left).localeCompare(getApplicationLabel(right), "fr")),
    [applications, trackedApplicationIds],
  );

  const summary = useMemo(() => {
    const active = followUps.filter((followUp) => (followUp.status || "ACTIVE") === "ACTIVE").length;
    const completed = followUps.filter((followUp) => followUp.status === "COMPLETED").length;
    const objectives = followUps.flatMap((followUp) => followUp.objectives || []);
    const completedObjectives = objectives.filter((objective) => objective.status === "DONE").length;

    return {
      active,
      completed,
      objectives: objectives.length,
      completedObjectives,
    };
  }, [followUps]);

  const handleCreateFollowUp = async () => {
    if (!applicationId) {
      setActionError("Sélectionnez une candidature acceptée.");
      return;
    }

    setIsCreatingFollowUp(true);
    setActionError("");

    try {
      const created = await createFromApplication(applicationId);
      setSelectedFollowUpId(created.id);
      setApplicationId("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de créer le suivi.");
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  const openCreateObjective = () => {
    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    setActionError("");
    setIsObjectiveModalOpen(true);
  };

  const openEditObjective = (objective: FollowUpObjective) => {
    setEditingObjective(objective);
    setObjectiveForm({
      title: objective.title,
      description: objective.description || "",
      priority: objective.priority || "MEDIUM",
      status: objective.status || "TODO",
      progress: String(objective.progress ?? 0),
      deadlineAt: toDateInputValue(objective.deadlineAt),
    });
    setActionError("");
    setIsObjectiveModalOpen(true);
  };

  const closeObjectiveModal = () => {
    if (isSavingObjective) {
      return;
    }

    setIsObjectiveModalOpen(false);
    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    setActionError("");
  };

  const handleObjectiveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeFollowUp) {
      setActionError("Aucun suivi sélectionné.");
      return;
    }

    const title = objectiveForm.title.trim();

    if (!title) {
      setActionError("Le titre de l’objectif est obligatoire.");
      return;
    }

    setIsSavingObjective(true);
    setActionError("");

    try {
      if (editingObjective) {
        await updateObjectiveByAdmin(editingObjective.id, {
          title,
          description: objectiveForm.description.trim(),
          priority: objectiveForm.priority,
          status: objectiveForm.status,
          progress: clampProgress(Number(objectiveForm.progress)),
          ...(objectiveForm.deadlineAt ? { deadlineAt: objectiveForm.deadlineAt } : {}),
        });
      } else {
        await addObjective(activeFollowUp.id, {
          title,
          ...(objectiveForm.description.trim()
            ? { description: objectiveForm.description.trim() }
            : {}),
          priority: objectiveForm.priority,
          ...(objectiveForm.deadlineAt ? { deadlineAt: objectiveForm.deadlineAt } : {}),
        });
      }

      setIsObjectiveModalOpen(false);
      setEditingObjective(null);
      setObjectiveForm(emptyObjectiveForm);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible d’enregistrer l’objectif.");
    } finally {
      setIsSavingObjective(false);
    }
  };

  const isLoading = isFollowUpsLoading || isApplicationsLoading;

  return (
    <RoleGuard allowedRole="ADMIN">
      <div className="space-y-6">
        <section className="motion-rise dashboard-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">
                Pilotage incubation
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Suivi des startups incubées
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
                Créez un suivi depuis une candidature acceptée, définissez les objectifs et
                consultez les comptes rendus transmis par les startups.
              </p>
            </div>

            <Button
              disabled={isLoading}
              onClick={() => void refresh().catch(() => {
              })}
              type="button"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>

          <SummaryCards
            active={summary.active}
            completed={summary.completed}
            completedObjectives={summary.completedObjectives}
            objectives={summary.objectives}
          />
        </section>

        <StartFollowUpPanel
          applicationId={applicationId}
          availableApplications={availableApplications}
          errorMessage={actionError || applicationsError || followUpsError}
          isCreating={isCreatingFollowUp}
          onApplicationChange={setApplicationId}
          onCreate={() => void handleCreateFollowUp()}
        />

        <section className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <FollowUpsList
            activeFollowUpId={activeFollowUpId}
            followUps={filteredFollowUps}
            isLoading={isFollowUpsLoading}
            onSearchQueryChange={setSearchQuery}
            onSelect={setSelectedFollowUpId}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
          />

          <div className="min-w-0 space-y-6">
            {!activeFollowUp && (
              <section className="dashboard-surface p-8 text-center">
                <Activity className="mx-auto h-10 w-10 text-brand" />
                <h2 className="mt-3 text-lg font-semibold text-foreground">
                  Aucun suivi sélectionné
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  Créez un suivi depuis une candidature acceptée ou sélectionnez un dossier.
                </p>
              </section>
            )}

            {activeFollowUp && (
              <>
                <FollowUpOverview followUp={activeFollowUp} />
                <ObjectivesSection
                  objectives={activeFollowUp.objectives || []}
                  onAddObjective={openCreateObjective}
                  onEditObjective={openEditObjective}
                />
                <UpdatesTimeline updates={activeFollowUp.updates || []} />
              </>
            )}
          </div>
        </section>
      </div>

      <ObjectiveModal
        editingObjective={editingObjective}
        error={actionError}
        isOpen={isObjectiveModalOpen}
        isSubmitting={isSavingObjective}
        onChange={setObjectiveForm}
        onClose={closeObjectiveModal}
        onSubmit={handleObjectiveSubmit}
        values={objectiveForm}
      />
    </RoleGuard>
  );
}
