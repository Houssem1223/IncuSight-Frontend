"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { useAuth } from "@/src/contexts/AuthContext";
import { useProgramEvaluators } from "@/src/contexts/ProgramEvaluatorContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useUsers } from "@/src/contexts/UserContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import type { Program } from "@/src/types/program";
import CreateProgramModal from "./programs/CreateProgramModal";
import EditProgramModal from "./programs/EditProgramModal";
import {
  buildProgramPayload,
  emptyProgramForm,
  getProgramFormValidationError,
  mapProgramToForm,
  type ProgramEditFormState,
  type ProgramFormState,
} from "./programs/programHelpers";
import ProgramsTable from "./programs/ProgramsTable";

export default function AdminProgramsManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    programs,
    isProgramsLoading,
    programsError,
    clearProgramsError,
    fetchAllPrograms,
    createProgram,
    updateProgram,
    removeProgram,
  } = usePrograms();
  const {
    evaluatorsByProgramId,
    fetchProgramEvaluators,
    assignProgramEvaluator,
    removeProgramEvaluator,
    clearProgramEvaluatorsCache,
  } = useProgramEvaluators();
  const { users, fetchAllUsers } = useUsers();

  const [searchTerm, setSearchTerm] = useState("");
  const [createForm, setCreateForm] = useState<ProgramFormState>(emptyProgramForm);
  const [editForm, setEditForm] = useState<ProgramEditFormState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [assigningEvaluatorProgramId, setAssigningEvaluatorProgramId] = useState<string | null>(null);
  const [removingEvaluatorProgramId, setRemovingEvaluatorProgramId] = useState<string | null>(null);
  const [selectedEvaluatorByProgramId, setSelectedEvaluatorByProgramId] = useState<Record<string, string>>({});
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const refreshPrograms = useCallback(async () => {
    clearProgramsError();

    try {
      await fetchAllPrograms();
    } catch {
    }
  }, [clearProgramsError, fetchAllPrograms]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void fetchAllUsers().catch(() => {
    });
  }, [isAuthReady, isAuthenticated, fetchAllUsers]);

  useAutoRefresh(refreshPrograms, {
    enabled: isAuthReady && isAuthenticated,
    intervalMs: 60000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
  });

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || programs.length === 0) {
      return;
    }

    void Promise.all(
      programs.map((program) =>
        fetchProgramEvaluators(program.id).catch(() => {
        }),
      ),
    );
  }, [isAuthReady, isAuthenticated, programs, fetchProgramEvaluators]);

  const sortedPrograms = useMemo(
    () => [...programs].sort((a, b) => a.title.localeCompare(b.title)),
    [programs],
  );

  const filteredPrograms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedPrograms;
    }

    return sortedPrograms.filter((program) => {
      const title = program.title.toLowerCase();
      const description = program.description.toLowerCase();
      const state = program.isOpen ? "open" : "closed";

      return (
        title.includes(query) ||
        description.includes(query) ||
        state.includes(query) ||
        program.openDate.toLowerCase().includes(query) ||
        program.closeDate.toLowerCase().includes(query) ||
        program.id.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, sortedPrograms]);

  const evaluatorUsers = useMemo(
    () => users.filter((user) => user.role === "EVALUATOR"),
    [users],
  );

  const handleSelectEvaluator = (programId: string, evaluatorId: string) => {
    setSelectedEvaluatorByProgramId((current) => ({
      ...current,
      [programId]: evaluatorId,
    }));
  };

  const handleAssignEvaluator = async (programId: string) => {
    resetActionFeedback();

    const selectedEvaluatorId = selectedEvaluatorByProgramId[programId];

    if (!selectedEvaluatorId) {
      setActionError("Selectionne un evaluateur avant l'affectation.");
      return;
    }

    setAssigningEvaluatorProgramId(programId);

    try {
      await assignProgramEvaluator(programId, selectedEvaluatorId);
      setActionMessage("Evaluateur affecte au programme avec succes.");
      setSelectedEvaluatorByProgramId((current) => ({
        ...current,
        [programId]: "",
      }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de l'affectation de l'evaluateur.");
    } finally {
      setAssigningEvaluatorProgramId(null);
    }
  };

  const handleRemoveEvaluator = async (programId: string, evaluatorId: string) => {
    resetActionFeedback();
    setRemovingEvaluatorProgramId(programId);

    try {
      await removeProgramEvaluator(programId, evaluatorId);
      setActionMessage("Evaluateur retire du programme avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec du retrait de l'evaluateur.");
    } finally {
      setRemovingEvaluatorProgramId(null);
    }
  };

  const openCreateModal = () => {
    clearProgramsError();
    resetActionFeedback();
    setCreateForm(emptyProgramForm);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
  };

  const handleCreateProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetActionFeedback();

    const validationError = getProgramFormValidationError(createForm);

    if (validationError) {
      setActionError(validationError);
      return;
    }

    setIsCreating(true);

    try {
      await createProgram(buildProgramPayload(createForm));
      await refreshPrograms();

      setCreateForm(emptyProgramForm);
      setActionMessage("Programme cree avec succes.");
      setIsCreateModalOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de creation du programme.");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (program: Program) => {
    resetActionFeedback();
    setEditForm(mapProgramToForm(program));
  };

  const cancelEdit = () => {
    if (editingProgramId) {
      return;
    }

    setEditForm(null);
  };

  const handleUpdateProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    resetActionFeedback();

    const validationError = getProgramFormValidationError(editForm);

    if (validationError) {
      setActionError(validationError);
      return;
    }

    setEditingProgramId(editForm.id);

    try {
      await updateProgram(editForm.id, buildProgramPayload(editForm));
      await refreshPrograms();

      setEditForm(null);
      setActionMessage("Programme mis a jour avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de mise a jour du programme.");
    } finally {
      setEditingProgramId(null);
    }
  };

  const handleDeleteProgram = (program: Program) => {
    resetActionFeedback();
    setProgramToDelete(program);
  };

  const cancelDeleteProgram = () => {
    if (deletingProgramId) {
      return;
    }

    setProgramToDelete(null);
  };

  const confirmDeleteProgram = async () => {
    if (!programToDelete) {
      return;
    }

    setDeletingProgramId(programToDelete.id);

    try {
      await removeProgram(programToDelete.id);
      clearProgramEvaluatorsCache(programToDelete.id);

      if (editForm?.id === programToDelete.id) {
        setEditForm(null);
      }

      setActionMessage("Programme supprime avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de suppression du programme.");
    } finally {
      setDeletingProgramId(null);
      setProgramToDelete(null);
    }
  };

  return (
    <RoleGuard allowedRole="ADMIN">
      <section className="motion-rise dashboard-surface p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Gestion des programmes</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {searchTerm.trim()
                ? `${filteredPrograms.length} sur ${programs.length} programmes affiches`
                : `Total programmes: ${programs.length}`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Recherche
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Titre, description, ouvert/ferme, dates, id..."
              type="text"
              value={searchTerm}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95"
            onClick={openCreateModal}
            type="button"
          >
            Creer un programme
          </button>
        </div>

        {actionMessage && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        )}

        {actionError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {isProgramsLoading && (
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {!isProgramsLoading && programsError && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {programsError}
          </p>
        )}

        {!isProgramsLoading && !programsError && (
          <ProgramsTable
            assigningEvaluatorProgramId={assigningEvaluatorProgramId}
            deletingProgramId={deletingProgramId}
            evaluatorUsers={evaluatorUsers}
            evaluatorsByProgramId={evaluatorsByProgramId}
            hasSearchTerm={Boolean(searchTerm.trim())}
            onAssignEvaluator={(programId) => {
              void handleAssignEvaluator(programId);
            }}
            onDelete={handleDeleteProgram}
            onEdit={startEdit}
            onRemoveEvaluator={(programId, evaluatorId) => {
              void handleRemoveEvaluator(programId, evaluatorId);
            }}
            onSelectEvaluator={handleSelectEvaluator}
            programs={filteredPrograms}
            removingEvaluatorProgramId={removingEvaluatorProgramId}
            selectedEvaluatorByProgramId={selectedEvaluatorByProgramId}
          />
        )}

        <ConfirmDialog
          cancelLabel="Annuler"
          confirmLabel="Supprimer"
          description={
            programToDelete
              ? `Cette action supprimera définitivement \"${programToDelete.title}\".`
              : undefined
          }
          isConfirming={Boolean(programToDelete && deletingProgramId === programToDelete.id)}
          isOpen={Boolean(programToDelete)}
          onCancel={cancelDeleteProgram}
          onConfirm={() => {
            void confirmDeleteProgram();
          }}
          title="Supprimer ce programme ?"
          tone="danger"
        />
      </section>

      <EditProgramModal
        error={actionError}
        isSubmitting={Boolean(editingProgramId)}
        onChange={setEditForm}
        onClose={cancelEdit}
        onSubmit={handleUpdateProgram}
        values={editForm}
      />

      <CreateProgramModal
        error={actionError}
        isOpen={isCreateModalOpen}
        isSubmitting={isCreating}
        onChange={setCreateForm}
        onClose={closeCreateModal}
        onSubmit={handleCreateProgram}
        values={createForm}
      />
    </RoleGuard>
  );
}
