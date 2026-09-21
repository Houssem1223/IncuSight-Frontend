"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { Button } from "@/src/components/ui/button";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useSelectedFollowUp } from "@/src/hooks/useSelectedFollowUp";
import type {
  FollowUpObjective,
  FollowUpPhase,
  FollowUpStatus,
} from "@/src/types/incubation-followups";
import {
  clampProgress,
  emptyObjectiveForm,
  followUpStatusLabels,
  formatDate,
  getApplicationLabel,
  toDateInputValue,
  type ObjectiveFormState,
} from "./followups/followupHelpers";
import ObjectiveModal from "./followups/ObjectiveModal";
import {
  getFollowUpLockMessage,
  isFollowUpOpen,
} from "@/src/lib/incubation-followup-state";
import { downloadIncubationCsv } from "@/src/lib/reports";
import { invalidateStartupVigilance } from "@/src/lib/startup-vigilance-query";

import IncubationStartupSidebar from "./incubation-workspace/IncubationStartupSidebar";
import IncubationWorkspaceContent from "./incubation-workspace/IncubationWorkspaceContent";
import NewFollowUpDialog from "./incubation-workspace/NewFollowUpDialog";
import IncubationWorkspace from "./incubation-workspace/IncubationWorkspace";

export default function AdminIncubationFollowupsManagement() {
  const { isAuthReady, isAuthenticated, token } = useAuth();
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
    updateFollowUp,
    addObjective,
    updateObjectiveByAdmin,
  } = useIncubationFollowups();

  // Source des programmes du filtre de vigilance : la meme que les filtres du
  // dashboard. Le classement ne cite que les programmes ayant un suivi actif,
  // ce qui ne suffit pas a peupler un Select de tous les programmes.
  const { programs, fetchAllPrograms } = usePrograms();

  // Objectifs et statut alimentent le score de vigilance : le laisser tel quel
  // apres une modification afficherait un indicateur perime a cote des donnees
  // qui viennent de changer.
  const queryClient = useQueryClient();

  // Drill-down depuis le classement de vigilance du dashboard, comme
  // `AdminApplicationsManagement` le fait deja avec ses propres parametres.
  // L'URL fait foi : Precedent/Suivant du navigateur resynchronisent la
  // selection sans etat local a recopier.
  const { selectedFollowUpId, selectFollowUp } = useSelectedFollowUp();
  const [applicationId, setApplicationId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<FollowUpObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormState>(emptyObjectiveForm);
  const [isSavingObjective, setIsSavingObjective] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<FollowUpStatus | null>(null);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);

  const refresh = useCallback(async () => {
    clearApplicationsError();
    clearFollowUpsError();
    setActionError("");

    await Promise.all([
      fetchAllApplications(),
      fetchAllFollowUps(),
      // Le filtre par programme retombe sur « Tous les programmes » si la liste
      // ne charge pas : ce n'est pas une raison de faire echouer l'ecran.
      fetchAllPrograms().catch(() => []),
    ]);
  }, [
    clearApplicationsError,
    clearFollowUpsError,
    fetchAllApplications,
    fetchAllFollowUps,
    fetchAllPrograms,
  ]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refresh().catch(() => {
    });
  }, [isAuthReady, isAuthenticated, refresh]);

  // Explicit URL selection also supports the mobile list → detail flow.
  const activeFollowUpId = selectedFollowUpId;
  const activeFollowUp = followUps.find(followUp => followUp.id === activeFollowUpId) ?? null;

  // A browser Back/Forward can change the dossier while a dialog is open.
  // Close that dialog so its draft cannot be submitted against another startup.
  useEffect(() => {
    setPendingStatusChange(null);
    setIsObjectiveModalOpen(false);
    setEditingObjective(null);
    setActionError("");
  }, [activeFollowUpId]);

  // Statut et notes internes restent modifiables sur un suivi clos — sinon on ne
  // pourrait plus le rouvrir. Ce sont les objectifs qui se figent.
  const isActiveFollowUpEditable = isFollowUpOpen(activeFollowUp?.status);
  const followUpLockMessage = getFollowUpLockMessage(activeFollowUp?.status, "ADMIN");

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

  // Recharge le brouillon a chaque changement de dossier (et apres enregistrement,
  // la valeur revenant du serveur) : sans ca, les notes d'un dossier resteraient
  // affichees en selectionnant le suivant.
  useEffect(() => {
    setNotesDraft(activeFollowUp?.notes ?? "");
  }, [activeFollowUp?.id, activeFollowUp?.notes]);

  const handleSaveNotes = async () => {
    if (!activeFollowUp) {
      return;
    }

    setActionError("");
    setIsSavingNotes(true);

    try {
      await updateFollowUp(activeFollowUp.id, { notes: notesDraft });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible d'enregistrer les notes.",
      );
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token) {
      return;
    }

    setActionError("");
    setIsExportingCsv(true);

    try {
      await downloadIncubationCsv(token);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Impossible d'exporter les suivis d'incubation.",
      );
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!applicationId) {
      setActionError("Sélectionnez une candidature acceptée.");
      return;
    }

    setIsCreatingFollowUp(true);
    setActionError("");

    try {
      const created = await createFromApplication(applicationId);
      selectFollowUp(created.id);
      setApplicationId("");
      setIsCreateOpen(false);
      await invalidateStartupVigilance(queryClient);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de créer le suivi.");
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  const handlePhaseChange = async (phase: FollowUpPhase) => {
    if (!activeFollowUp) {
      return;
    }

    setActionError("");
    setIsUpdatingFollowUp(true);

    try {
      await updateFollowUp(activeFollowUp.id, { phase });
      await invalidateStartupVigilance(queryClient, activeFollowUp.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de mettre à jour la phase.");
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const handleRequestStatusChange = (status: FollowUpStatus) => {
    if (!activeFollowUp || status === (activeFollowUp.status || "ACTIVE")) {
      return;
    }

    setPendingStatusChange(status);
  };

  const cancelStatusChange = () => {
    if (isUpdatingFollowUp) {
      return;
    }

    setPendingStatusChange(null);
  };

  const confirmStatusChange = async () => {
    if (!activeFollowUp || !pendingStatusChange) {
      return;
    }

    setActionError("");
    setIsUpdatingFollowUp(true);

    try {
      const isTerminal = pendingStatusChange !== "ACTIVE";

      await updateFollowUp(activeFollowUp.id, {
        status: pendingStatusChange,
        ...(isTerminal ? { endDate: new Date().toISOString().slice(0, 10) } : {}),
      });
      await invalidateStartupVigilance(queryClient, activeFollowUp.id);
      setPendingStatusChange(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de mettre à jour le statut.");
    } finally {
      setIsUpdatingFollowUp(false);
    }
  };

  const openCreateObjective = () => {
    if (!isActiveFollowUpEditable) {
      return;
    }

    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    setActionError("");
    setIsObjectiveModalOpen(true);
  };

  const openEditObjective = (objective: FollowUpObjective) => {
    if (!isActiveFollowUpEditable) {
      return;
    }

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

    if (!isActiveFollowUpEditable) {
      setActionError(followUpLockMessage || "Ce suivi n’accepte plus de modification.");
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

      await invalidateStartupVigilance(queryClient, activeFollowUpId);
      setIsObjectiveModalOpen(false);
      setEditingObjective(null);
      setObjectiveForm(emptyObjectiveForm);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible d’enregistrer l’objectif.");
    } finally {
      setIsSavingObjective(false);
    }
  };

  return (
    <RoleGuard allowedRole="ADMIN">
      <IncubationWorkspace selected={Boolean(activeFollowUpId)}>
        <header className="inc-module-header">
          <div><p className="inc-eyebrow">Accompagnement</p><h1>Suivi incubation</h1><p>Pilotez l’accompagnement et l’évolution des startups incubées.</p></div>
          <div className="inc-module-actions">
            <Button type="button" variant="outline" disabled={isExportingCsv} onClick={() => void handleExportCsv()}>{isExportingCsv ? "Export…" : "Exporter en CSV"}</Button>
          </div>
        </header>
        <dl className="inc-stat-strip">
          <div><dd>{summary.active}</dd><dt>suivis actifs</dt></div><div><dd>{summary.completed}</dd><dt>terminés</dt></div>
          <div><dd>{summary.objectives}</dd><dt>objectifs</dt></div><div><dd>{summary.completedObjectives}</dd><dt>réalisés</dt></div>
        </dl>
        {actionError && !isCreateOpen && !isObjectiveModalOpen && <p role="alert" className="inc-error">{actionError}</p>}
        <div className="inc-layout">
          <IncubationStartupSidebar selectedId={activeFollowUpId} onSelect={selectFollowUp} programs={programs} onCreate={() => setIsCreateOpen(true)} hasFollowUps={followUps.length > 0} />
          <div className="inc-detail">
            {followUpsError && <div role="alert" className="inc-error">{followUpsError}<Button variant="outline" size="sm" onClick={() => void fetchAllFollowUps().catch(() => {})}>Réessayer le suivi</Button></div>}
            {!activeFollowUp && isFollowUpsLoading && <div className="inc-skeletons" role="status" aria-label="Chargement du suivi"><div /><div /><div /></div>}
            {!activeFollowUp && !isFollowUpsLoading && <div className="inc-empty">
              <Activity aria-hidden="true" size={28} />
              <h2>{activeFollowUpId ? "Suivi indisponible" : followUps.length ? "Votre espace d’accompagnement" : "Aucune startup en incubation"}</h2>
              <p>{activeFollowUpId ? "Ce dossier n’a pas pu être trouvé. Vous pouvez sélectionner une autre startup." : followUps.length ? "Sélectionnez une startup pour consulter son suivi." : "Commencez par créer un suivi à partir d’une candidature acceptée."}</p>
              {activeFollowUpId && <Button type="button" variant="outline" onClick={() => selectFollowUp("")}>Retour aux startups</Button>}
              {!followUps.length && !followUpsError && <Button type="button" onClick={() => setIsCreateOpen(true)}>Créer un suivi</Button>}
            </div>}
            {activeFollowUp && <IncubationWorkspaceContent key={activeFollowUp.id} followUp={activeFollowUp}
              busy={isUpdatingFollowUp} onPhase={phase => void handlePhaseChange(phase)} onStatus={handleRequestStatusChange} onBack={() => selectFollowUp("")}
              objectives={{ objectives: activeFollowUp.objectives ?? [], isEditable: isActiveFollowUpEditable, lockMessage: followUpLockMessage, onAddObjective: openCreateObjective, onEditObjective: openEditObjective }}
              notes={{ value: notesDraft, savedValue: activeFollowUp.notes ?? "", busy: isSavingNotes, onChange: setNotesDraft, onSave: () => void handleSaveNotes() }}
            />}
          </div>
        </div>
      </IncubationWorkspace>
      <NewFollowUpDialog isOpen={isCreateOpen} onClose={() => { if (!isCreatingFollowUp) setIsCreateOpen(false); }} applications={availableApplications} value={applicationId} onChange={setApplicationId} onCreate={() => void handleCreateFollowUp()} busy={isCreatingFollowUp || isApplicationsLoading || isFollowUpsLoading} error={actionError || applicationsError} />

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

      <ConfirmDialog
        confirmLabel="Confirmer"
        description={
          pendingStatusChange && pendingStatusChange !== "ACTIVE"
            ? `Le suivi sera marqué « ${followUpStatusLabels[pendingStatusChange]} » avec une date de fin au ${formatDate(new Date().toISOString())}.`
            : "Le suivi repassera au statut « Actif »."
        }
        isConfirming={isUpdatingFollowUp}
        isOpen={pendingStatusChange !== null}
        onCancel={cancelStatusChange}
        onConfirm={() => void confirmStatusChange()}
        title="Changer le statut du suivi ?"
        tone={pendingStatusChange && pendingStatusChange !== "ACTIVE" ? "danger" : "brand"}
      />
    </RoleGuard>
  );
}
