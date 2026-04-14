"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormTextarea,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";
import type { Startup } from "@/src/types/startup";

const MAX_STARTUPS_PER_USER = 5;

type StartupFormState = {
  startupName: string;
  description: string;
  sector: string;
  stage: string;
  website: string;
};

const emptyForm: StartupFormState = {
  startupName: "",
  description: "",
  sector: "",
  stage: "",
  website: "",
};

function mapStartupToForm(startup: Startup): StartupFormState {
  return {
    startupName: startup.startupName,
    description: startup.description ?? "",
    sector: startup.sector ?? "",
    stage: startup.stage ?? "",
    website: startup.website ?? "",
  };
}

function buildStartupPayload(form: StartupFormState) {
  const startupName = form.startupName.trim();
  const description = form.description.trim();
  const sector = form.sector.trim();
  const stage = form.stage.trim();
  const website = form.website.trim();

  const payload: {
    startupName: string;
    description?: string;
    sector?: string;
    stage?: string;
    website?: string;
  } = {
    startupName,
  };

  if (description) {
    payload.description = description;
  }

  if (sector) {
    payload.sector = sector;
  }

  if (stage) {
    payload.stage = stage;
  }

  if (website) {
    payload.website = website;
  }

  return payload;
}

export default function StartupManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    myStartups,
    isStartupsLoading,
    startupsError,
    clearStartupsError,
    fetchMyStartups,
    createStartup,
    updateMyStartup,
    removeMyStartup,
  } = useStartups();

  const [form, setForm] = useState<StartupFormState>(emptyForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStartupId, setEditingStartupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingStartupId, setDeletingStartupId] = useState<string | null>(null);
  const [startupToDelete, setStartupToDelete] = useState<Startup | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const formIdPrefix = useId();
  const canCreateMore = myStartups.length < MAX_STARTUPS_PER_USER;
  const remainingSlots = Math.max(MAX_STARTUPS_PER_USER - myStartups.length, 0);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void fetchMyStartups();
  }, [isAuthReady, isAuthenticated, fetchMyStartups]);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openCreateForm = () => {
    if (!canCreateMore) {
      setActionError(`You can only submit up to ${MAX_STARTUPS_PER_USER} startups.`);
      return;
    }

    clearStartupsError();
    resetActionFeedback();
    setEditingStartupId(null);
    setForm(emptyForm);
    setIsFormVisible(true);
  };

  const openEditForm = (startup: Startup) => {
    clearStartupsError();
    resetActionFeedback();
    setForm(mapStartupToForm(startup));
    setEditingStartupId(startup.id);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormVisible(false);
    setEditingStartupId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    resetActionFeedback();

    if (!form.startupName.trim()) {
      setActionError("Startup name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildStartupPayload(form);

      if (editingStartupId) {
        await updateMyStartup(editingStartupId, payload);
        setActionMessage("Startup profile updated successfully.");
      } else {
        await createStartup(payload);
        setActionMessage("Startup created successfully.");
      }

      await fetchMyStartups();
      setIsFormVisible(false);
      setEditingStartupId(null);
      setForm(emptyForm);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save startup data.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = (startup: Startup) => {
    if (isSaving) {
      return;
    }

    resetActionFeedback();
    setStartupToDelete(startup);
  };

  const cancelDelete = () => {
    if (deletingStartupId) {
      return;
    }

    setStartupToDelete(null);
  };

  const confirmDelete = async () => {
    if (!startupToDelete) {
      return;
    }

    const startup = startupToDelete;

    setDeletingStartupId(startup.id);

    try {
      await removeMyStartup(startup.id);

      if (editingStartupId === startup.id) {
        setForm(emptyForm);
        setIsFormVisible(false);
        setEditingStartupId(null);
      }

      setActionMessage("Startup removed successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to remove startup.");
    } finally {
      setDeletingStartupId(null);
      setStartupToDelete(null);
    }
  };

  const fieldId = (field: string) => `${formIdPrefix}-${field}`;

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">Startup Space</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          My Startups
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Cree jusqu'a {MAX_STARTUPS_PER_USER} profils startup et garde-les a jour.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Created</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{myStartups.length}</p>
          </article>

          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Remaining</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{remainingSlots}</p>
          </article>

          <div className="flex items-end md:justify-end">
            {canCreateMore && !isFormVisible && (
              <button
                className="dashboard-btn w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast md:w-auto"
                onClick={openCreateForm}
                type="button"
              >
                Ajouter une startup
              </button>
            )}
          </div>
        </div>

        {myStartups.length === 0 && !isFormVisible && (
          <div className="dashboard-soft-block mt-5 bg-gradient-to-br from-brand/10 via-white to-sky-50 p-5">
            <p className="text-sm text-foreground-muted">Vous n'avez pas encore de startup.</p>
            <button
              className="dashboard-btn mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95"
              disabled={!canCreateMore}
              onClick={openCreateForm}
              type="button"
            >
              Creer une startup
            </button>
          </div>
        )}

        {myStartups.length > 0 && (
          <div className="mt-5 grid gap-4">
            {myStartups.map((startup) => {
              const isRemoving = deletingStartupId === startup.id;

              return (
                <article
                  className="dashboard-card group p-4"
                  key={startup.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{startup.startupName}</h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-border bg-white px-2.5 py-1 text-foreground-muted">
                          {startup.sector || "Sector not set"}
                        </span>
                        <span className="rounded-full border border-border bg-white px-2.5 py-1 text-foreground-muted">
                          {startup.stage || "Stage not set"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-foreground-muted">
                    {startup.description || "Aucune description fournie."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                      onClick={() => openEditForm(startup)}
                      type="button"
                    >
                      Modifier
                    </button>
                    <button
                      className="dashboard-btn rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isRemoving}
                      onClick={() => {
                        requestDelete(startup);
                      }}
                      type="button"
                    >
                      {isRemoving ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {isStartupsLoading && myStartups.length === 0 && (
          <div className="mt-5 space-y-2">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {startupsError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {startupsError}
          </p>
        )}

        {actionError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </p>
        )}

        {actionMessage && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        )}
      </section>

      <FormModal
        description="Formulaire moderne, fluide et coherent pour votre startup."
        isBusy={isSaving}
        isOpen={isFormVisible}
        onClose={cancelForm}
        onSubmit={handleSubmit}
        title={editingStartupId ? "Modifier la startup" : "Creer une startup"}
      >
        <FormErrorMessage message={actionError} />

        <FormField htmlFor={fieldId("startupName")} label="Nom de la startup" required>
          <FormInput
            autoFocus
            id={fieldId("startupName")}
            onChange={(event) =>
              setForm((current) => ({ ...current, startupName: event.target.value }))
            }
            placeholder="Nom de la startup"
            required
            type="text"
            value={form.startupName}
          />
        </FormField>

        <FormField htmlFor={fieldId("sector")} label="Secteur">
          <FormInput
            id={fieldId("sector")}
            onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
            placeholder="Secteur"
            type="text"
            value={form.sector}
          />
        </FormField>

        <FormField htmlFor={fieldId("stage")} label="Stade">
          <FormInput
            id={fieldId("stage")}
            onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
            placeholder="Stade"
            type="text"
            value={form.stage}
          />
        </FormField>

        <FormField htmlFor={fieldId("website")} label="Site web">
          <FormInput
            id={fieldId("website")}
            onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            placeholder="https://votre-site.com"
            type="url"
            value={form.website}
          />
        </FormField>

        <FormField htmlFor={fieldId("description")} label="Description">
          <FormTextarea
            id={fieldId("description")}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Decrivez votre startup"
            value={form.description}
          />
        </FormField>

        <FormActions>
          <button
            className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
            onClick={cancelForm}
            type="button"
          >
            Annuler
          </button>
          <button
            className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Enregistrement..." : editingStartupId ? "Mettre a jour" : "Creer"}
          </button>
        </FormActions>
      </FormModal>

      <ConfirmDialog
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        description={
          startupToDelete
            ? `Cette action supprimera definitivement la startup \"${startupToDelete.startupName}\".`
            : undefined
        }
        isConfirming={Boolean(startupToDelete && deletingStartupId === startupToDelete.id)}
        isOpen={Boolean(startupToDelete)}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
        title="Supprimer cette startup ?"
        tone="danger"
      />
    </RoleGuard>
  );
}
