"use client";

import { FormEvent, useEffect, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";
import type { Startup } from "@/src/types/startup";

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

export default function StartupApplicationManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    myStartup,
    isStartupsLoading,
    startupsError,
    clearStartupsError,
    fetchMyStartup,
    createStartup,
    updateMyStartup,
    removeMyStartup,
  } = useStartups();

  const [form, setForm] = useState<StartupFormState>(emptyForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void fetchMyStartup();
  }, [isAuthReady, isAuthenticated, fetchMyStartup]);

  useEffect(() => {
    if (!myStartup) {
      return;
    }

    setForm(mapStartupToForm(myStartup));
  }, [myStartup]);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openCreateForm = () => {
    clearStartupsError();
    resetActionFeedback();
    setIsEditing(false);
    setForm(emptyForm);
    setIsFormVisible(true);
  };

  const openEditForm = () => {
    if (!myStartup) {
      return;
    }

    clearStartupsError();
    resetActionFeedback();
    setForm(mapStartupToForm(myStartup));
    setIsEditing(true);
    setIsFormVisible(true);
  };

  const cancelForm = () => {
    setIsFormVisible(false);
    setIsEditing(false);

    if (myStartup) {
      setForm(mapStartupToForm(myStartup));
    } else {
      setForm(emptyForm);
    }
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

      if (isEditing && myStartup) {
        await updateMyStartup(payload);
        setActionMessage("Startup profile updated successfully.");
      } else {
        await createStartup(payload);
        setActionMessage("Application submitted successfully.");
      }

      await fetchMyStartup();
      setIsFormVisible(false);
      setIsEditing(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save startup data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!myStartup) {
      return;
    }

    const confirmed = window.confirm("Delete your startup application?");

    if (!confirmed) {
      return;
    }

    resetActionFeedback();
    setIsDeleting(true);

    try {
      await removeMyStartup();
      setForm(emptyForm);
      setIsFormVisible(false);
      setIsEditing(false);
      setActionMessage("Startup application removed.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to remove startup.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise rounded-2xl border border-border/75 bg-white/90 p-6 shadow-[var(--shadow-soft)]">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
          Startup Space
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Startup Application
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Submit your startup candidature, then update details while your dossier is under review.
        </p>

        {!myStartup && !isFormVisible && (
          <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 p-4">
            <p className="text-sm text-foreground-muted">
              You have no startup application yet.
            </p>
            <button
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95"
              onClick={openCreateForm}
              type="button"
            >
              Candidater maintenant
            </button>
          </div>
        )}

        {myStartup && (
          <article className="mt-5 rounded-2xl border border-border/75 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{myStartup.startupName}</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {myStartup.sector || "Sector not set"}
                  {" • "}
                  {myStartup.stage || "Stage not set"}
                </p>
              </div>

              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                {myStartup.status || "PENDING"}
              </span>
            </div>

            <p className="mt-3 text-sm text-foreground-muted">
              {myStartup.description || "No description provided."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                onClick={openEditForm}
                type="button"
              >
                Edit candidature
              </button>
              <button
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isDeleting}
                onClick={() => {
                  void handleDelete();
                }}
                type="button"
              >
                {isDeleting ? "Removing..." : "Remove candidature"}
              </button>
            </div>
          </article>
        )}

        {(isFormVisible || (!myStartup && isStartupsLoading)) && (
          <form
            className="mt-6 grid gap-3 rounded-2xl border border-border/75 bg-white p-4 md:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <h2 className="md:col-span-2 text-base font-semibold text-foreground">
              {isEditing ? "Update startup" : "Create startup candidature"}
            </h2>

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) =>
                setForm((current) => ({ ...current, startupName: event.target.value }))
              }
              placeholder="Startup name"
              required
              type="text"
              value={form.startupName}
            />

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
              placeholder="Sector"
              type="text"
              value={form.sector}
            />

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
              placeholder="Stage"
              type="text"
              value={form.stage}
            />

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              placeholder="Website"
              type="url"
              value={form.website}
            />

            <textarea
              className="md:col-span-2 min-h-28 rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Describe your startup"
              value={form.description}
            />

            <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                onClick={cancelForm}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : isEditing ? "Update" : "Submit candidature"}
              </button>
            </div>
          </form>
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
    </RoleGuard>
  );
}
