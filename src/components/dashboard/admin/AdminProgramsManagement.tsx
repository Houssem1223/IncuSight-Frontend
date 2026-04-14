"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import {
  FormActions,
  FormCheckbox,
  FormDateTimeInput,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormTextarea,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { usePrograms } from "@/src/contexts/ProgramContext";
import type { Program } from "@/src/types/program";

type ProgramFormState = {
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isOpen: boolean;
};

type ProgramEditFormState = ProgramFormState & {
  id: string;
};

type ProgramPayload = {
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isOpen: boolean;
};

function toDateTimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDate(localDate: string): string {
  return new Date(localDate).toISOString();
}

function formatProgramDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function mapProgramToForm(program: Program): ProgramEditFormState {
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    openDate: toDateTimeLocalValue(program.openDate),
    closeDate: toDateTimeLocalValue(program.closeDate),
    isOpen: program.isOpen,
  };
}

function buildProgramPayload(form: ProgramFormState): ProgramPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    openDate: toIsoDate(form.openDate),
    closeDate: toIsoDate(form.closeDate),
    isOpen: form.isOpen,
  };
}

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

  const [searchTerm, setSearchTerm] = useState("");
  const [createForm, setCreateForm] = useState<ProgramFormState>({
    title: "",
    description: "",
    openDate: "",
    closeDate: "",
    isOpen: false,
  });
  const [editForm, setEditForm] = useState<ProgramEditFormState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const formIdPrefix = useId();

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

    void refreshPrograms();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshPrograms();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, 60000);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [isAuthReady, isAuthenticated, refreshPrograms]);

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

  const openCreateModal = () => {
    clearProgramsError();
    resetActionFeedback();
    setCreateForm({
      title: "",
      description: "",
      openDate: "",
      closeDate: "",
      isOpen: false,
    });
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

    const title = createForm.title.trim();
    const description = createForm.description.trim();

    if (!title) {
      setActionError("Program title is required.");
      return;
    }

    if (!description) {
      setActionError("Program description is required.");
      return;
    }

    if (!createForm.openDate || !createForm.closeDate) {
      setActionError("Open and close dates are required.");
      return;
    }

    if (new Date(createForm.closeDate).getTime() <= new Date(createForm.openDate).getTime()) {
      setActionError("Close date must be after open date.");
      return;
    }

    setIsCreating(true);

    try {
      await createProgram(buildProgramPayload(createForm));
      await refreshPrograms();

      setCreateForm({
        title: "",
        description: "",
        openDate: "",
        closeDate: "",
        isOpen: false,
      });
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

    const title = editForm.title.trim();
    const description = editForm.description.trim();

    if (!title) {
      setActionError("Program title is required.");
      return;
    }

    if (!description) {
      setActionError("Program description is required.");
      return;
    }

    if (!editForm.openDate || !editForm.closeDate) {
      setActionError("Open and close dates are required.");
      return;
    }

    if (new Date(editForm.closeDate).getTime() <= new Date(editForm.openDate).getTime()) {
      setActionError("Close date must be after open date.");
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

  const createFieldId = (field: string) => `${formIdPrefix}-create-${field}`;
  const editFieldId = (field: string) => `${formIdPrefix}-edit-${field}`;

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
          <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Programme</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Window</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                        {searchTerm.trim() ? "Aucun programme correspondant." : "Aucun programme."}
                      </td>
                    </tr>
                  )}

                  {filteredPrograms.map((program) => {
                    const description = program.description || "-";
                    const openDate = formatProgramDate(program.openDate);
                    const closeDate = formatProgramDate(program.closeDate);

                    return (
                      <tr className="border-t border-border/60" key={program.id}>
                        <td className="px-4 py-3 text-foreground">{program.title}</td>
                        <td className="px-4 py-3 text-foreground-muted">{description}</td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {openDate}
                          <br />
                          <span className="text-xs">a {closeDate}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              program.isOpen
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {program.isOpen ? "Ouvert" : "Ferme"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                              onClick={() => startEdit(program)}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="dashboard-btn rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={deletingProgramId === program.id}
                              onClick={() => handleDeleteProgram(program)}
                              type="button"
                            >
                              {deletingProgramId === program.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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

      {editForm && (
        <FormModal
          description="Ajustez les informations et les dates du programme."
          isBusy={Boolean(editingProgramId)}
          isOpen={Boolean(editForm)}
          onClose={cancelEdit}
          onSubmit={handleUpdateProgram}
          title="Modifier programme"
        >
          <FormErrorMessage message={actionError} />

          <FormField htmlFor={editFieldId("title")} label="Titre" required>
            <FormInput
              autoFocus
              id={editFieldId("title")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        title: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Titre du programme"
              required
              type="text"
              value={editForm.title}
            />
          </FormField>

          <FormField htmlFor={editFieldId("description")} label="Description" required>
            <FormTextarea
              id={editFieldId("description")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        description: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Description du programme"
              required
              value={editForm.description}
            />
          </FormField>

          <FormField htmlFor={editFieldId("openDate")} label="Date d'ouverture" required>
            <FormDateTimeInput
              id={editFieldId("openDate")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        openDate: event.target.value,
                      }
                    : current,
                )
              }
              required
              value={editForm.openDate}
            />
          </FormField>

          <FormField htmlFor={editFieldId("closeDate")} label="Date de fermeture" required>
            <FormDateTimeInput
              id={editFieldId("closeDate")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        closeDate: event.target.value,
                      }
                    : current,
                )
              }
              required
              value={editForm.closeDate}
            />
          </FormField>

          <FormCheckbox
            checked={editForm.isOpen}
            label="Programme actuellement ouvert"
            onChange={(event) =>
              setEditForm((current) =>
                current
                  ? {
                      ...current,
                      isOpen: event.target.checked,
                    }
                  : current,
              )
            }
          />

          <FormActions>
            <button
              className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
              disabled={Boolean(editingProgramId)}
              onClick={cancelEdit}
              type="button"
            >
              Annuler
            </button>

            <button
              className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={editingProgramId === editForm.id}
              type="submit"
            >
              {editingProgramId === editForm.id ? "Enregistrement..." : "Enregistrer"}
            </button>
          </FormActions>
        </FormModal>
      )}

      <FormModal
        description="Formulaire moderne pour publier rapidement un nouveau programme."
        isBusy={isCreating}
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateProgram}
        title="Creer un programme"
      >
        <FormErrorMessage message={actionError} />

        <FormField htmlFor={createFieldId("title")} label="Titre" required>
          <FormInput
            autoFocus
            id={createFieldId("title")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Titre du programme"
            required
            type="text"
            value={createForm.title}
          />
        </FormField>

        <FormField htmlFor={createFieldId("description")} label="Description" required>
          <FormTextarea
            id={createFieldId("description")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Description du programme"
            required
            value={createForm.description}
          />
        </FormField>

        <FormField htmlFor={createFieldId("openDate")} label="Date d'ouverture" required>
          <FormDateTimeInput
            id={createFieldId("openDate")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, openDate: event.target.value }))
            }
            required
            value={createForm.openDate}
          />
        </FormField>

        <FormField htmlFor={createFieldId("closeDate")} label="Date de fermeture" required>
          <FormDateTimeInput
            id={createFieldId("closeDate")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, closeDate: event.target.value }))
            }
            required
            value={createForm.closeDate}
          />
        </FormField>

        <FormCheckbox
          checked={createForm.isOpen}
          label="Programme actuellement ouvert"
          onChange={(event) =>
            setCreateForm((current) => ({ ...current, isOpen: event.target.checked }))
          }
        />

        <FormActions>
          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
            onClick={closeCreateModal}
            type="button"
          >
            Annuler
          </button>

          <button
            className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Creation..." : "Creer"}
          </button>
        </FormActions>
      </FormModal>
    </RoleGuard>
  );
}
