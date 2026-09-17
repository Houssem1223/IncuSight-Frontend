"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import StartupLogo from "@/src/components/dashboard/StartupLogo";
import {
  FormActions,
  FormCheckbox,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormTextarea,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStartups } from "@/src/contexts/StartupContext";
import { downloadPitchDeck } from "@/src/lib/pitch-deck";
import { useBusinessRules } from "@/src/hooks/useBusinessRules";
import type { Startup } from "@/src/types/startup";


const PITCH_DECK_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx";

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatUploadDate(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

type StartupFormState = {
  startupName: string;
  description: string;
  sector: string;
  stage: string;
  website: string;
  linkedinUrl: string;
  deckUrl: string;
  isPublicShowcase: boolean;
};

const emptyForm: StartupFormState = {
  startupName: "",
  description: "",
  sector: "",
  stage: "",
  website: "",
  linkedinUrl: "",
  deckUrl: "",
  isPublicShowcase: false,
};

function mapStartupToForm(startup: Startup): StartupFormState {
  return {
    startupName: startup.startupName,
    description: startup.description ?? "",
    sector: startup.sector ?? "",
    stage: startup.stage ?? "",
    website: startup.website ?? "",
    linkedinUrl: startup.linkedinUrl ?? "",
    deckUrl: startup.deckUrl ?? "",
    isPublicShowcase: startup.isPublicShowcase === true,
  };
}

// Miroir cote client des criteres de publication du backend (voir
// findPublicationBlockers cote serveur) : sert uniquement a avertir avant
// d'enregistrer un brouillon incomplet, pas a bloquer l'enregistrement lui-meme.
function getMissingPublicationFields(form: StartupFormState, hasPitchDeck: boolean): string[] {
  const missing: string[] = [];

  if (!form.description.trim()) {
    missing.push("la description");
  }

  if (!form.sector.trim()) {
    missing.push("le secteur d'activité");
  }

  if (!form.stage.trim()) {
    missing.push("le stade de maturité");
  }

  if (!hasPitchDeck) {
    missing.push("le pitch deck");
  }

  return missing;
}

function buildStartupPayload(form: StartupFormState) {
  const startupName = form.startupName.trim();
  const description = form.description.trim();
  const sector = form.sector.trim();
  const stage = form.stage.trim();
  const website = form.website.trim();
  const linkedinUrl = form.linkedinUrl.trim();
  const deckUrl = form.deckUrl.trim();

  const payload: {
    startupName: string;
    description?: string;
    sector?: string;
    stage?: string;
    website?: string;
    linkedinUrl?: string;
    deckUrl?: string;
    isPublicShowcase: boolean;
  } = {
    startupName,
    // Toujours envoye : c'est un booleen, l'omettre empecherait de revenir en
    // arriere apres avoir accepte la vitrine.
    isPublicShowcase: form.isPublicShowcase,
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

  if (linkedinUrl) {
    payload.linkedinUrl = linkedinUrl;
  }

  if (deckUrl) {
    payload.deckUrl = deckUrl;
  }

  return payload;
}

export default function StartupManagement() {
  const { isAuthReady, isAuthenticated, token } = useAuth();
  const {
    myStartups,
    isStartupsLoading,
    startupsError,
    clearStartupsError,
    fetchMyStartups,
    createStartup,
    updateMyStartup,
    removeMyStartup,
    publishStartup,
    uploadPitchDeck,
    uploadLogo,
  } = useStartups();

  const [form, setForm] = useState<StartupFormState>(emptyForm);
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStartupId, setEditingStartupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingIncompleteSave, setPendingIncompleteSave] = useState<string | null>(null);
  const [deletingStartupId, setDeletingStartupId] = useState<string | null>(null);
  const [startupToDelete, setStartupToDelete] = useState<Startup | null>(null);
  const [publishingStartupId, setPublishingStartupId] = useState<string | null>(null);
  const [uploadingPitchDeckId, setUploadingPitchDeckId] = useState<string | null>(null);
  const [downloadingPitchDeckId, setDownloadingPitchDeckId] = useState<string | null>(null);
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const formIdPrefix = useId();
  const { MAX_STARTUPS_PER_USER } = useBusinessRules();
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
    setPitchDeckFile(null);
    setIsFormVisible(true);
  };

  const openEditForm = (startup: Startup) => {
    clearStartupsError();
    resetActionFeedback();
    setForm(mapStartupToForm(startup));
    setPitchDeckFile(null);
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
    setPitchDeckFile(null);
  };

  const performSave = async () => {
    setIsSaving(true);

    try {
      const payload = buildStartupPayload(form);
      let savedStartup: Startup;

      if (editingStartupId) {
        savedStartup = await updateMyStartup(editingStartupId, payload);
        setActionMessage("Startup profile updated successfully.");
      } else {
        savedStartup = await createStartup(payload);
        setActionMessage("Startup created successfully.");
      }

      if (pitchDeckFile) {
        try {
          await uploadPitchDeck(savedStartup.id, pitchDeckFile);
        } catch (uploadError) {
          // Le profil est deja enregistre a ce stade ; seul le pitch deck a
          // echoue (format refuse...) — on le signale sans annuler le reste.
          setActionError(
            uploadError instanceof Error
              ? uploadError.message
              : "Le profil a ete enregistre, mais le pitch deck n'a pas pu etre televerse.",
          );
        }
      }

      await fetchMyStartups();
      setIsFormVisible(false);
      setEditingStartupId(null);
      setForm(emptyForm);
      setPitchDeckFile(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save startup data.");
    } finally {
      setIsSaving(false);
      setPendingIncompleteSave(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    resetActionFeedback();

    if (!form.startupName.trim()) {
      setActionError("Startup name is required.");
      return;
    }

    // Un profil deja publie ne repasse pas par ce controle : le retirer de
    // ses champs ne le "sauverait" pas en brouillon, le backend le refusera
    // de toute facon (message deja affiche tel quel via actionError).
    const editingStartup = editingStartupId
      ? myStartups.find((startup) => startup.id === editingStartupId)
      : null;
    const isAlreadyPublished = editingStartup?.status === "PUBLISHED";

    if (!isAlreadyPublished) {
      const hasPitchDeck = Boolean(pitchDeckFile) || Boolean(editingStartup?.pitchDeckOriginalName);
      const missing = getMissingPublicationFields(form, hasPitchDeck);

      if (missing.length > 0) {
        setPendingIncompleteSave(missing.join(", "));
        return;
      }
    }

    await performSave();
  };

  const cancelIncompleteSave = () => {
    if (isSaving) {
      return;
    }

    setPendingIncompleteSave(null);
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

  const handlePublish = async (startup: Startup) => {
    resetActionFeedback();
    setPublishingStartupId(startup.id);

    try {
      await publishStartup(startup.id);
      setActionMessage(`"${startup.startupName}" est maintenant publiee.`);
    } catch (error) {
      // Le backend liste precisement ce qui manque (description, secteur, pitch
      // deck...) : on affiche ce message tel quel plutot qu'un message generique.
      setActionError(error instanceof Error ? error.message : "Impossible de publier cette startup.");
    } finally {
      setPublishingStartupId(null);
    }
  };

  const handleLogoChange = async (startup: Startup, file: File | undefined) => {
    if (!file) {
      return;
    }

    resetActionFeedback();
    setUploadingLogoId(startup.id);

    try {
      await uploadLogo(startup.id, file);
      setActionMessage("Logo televerse avec succes.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de televerser le logo.",
      );
    } finally {
      setUploadingLogoId(null);
    }
  };

  const handlePitchDeckChange = async (startup: Startup, file: File | undefined) => {
    if (!file) {
      return;
    }

    resetActionFeedback();
    setUploadingPitchDeckId(startup.id);

    try {
      await uploadPitchDeck(startup.id, file);
      setActionMessage("Pitch deck televerse avec succes.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de televerser le pitch deck.");
    } finally {
      setUploadingPitchDeckId(null);
    }
  };

  const handleDownloadPitchDeck = async (startup: Startup) => {
    if (!token) {
      return;
    }

    resetActionFeedback();
    setDownloadingPitchDeckId(startup.id);

    try {
      await downloadPitchDeck(startup.id, token, startup.pitchDeckOriginalName);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Impossible de telecharger le pitch deck.");
    } finally {
      setDownloadingPitchDeckId(null);
    }
  };

  const fieldId = (field: string) => `${formIdPrefix}-${field}`;
  const editingStartupForPitchDeckHint = editingStartupId
    ? myStartups.find((startup) => startup.id === editingStartupId) ?? null
    : null;

  return (
    <RoleGuard allowedRole="STARTUP">
      <section className="motion-rise dashboard-surface p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-strong">Espace Startup </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Mes Startups
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Cree jusqu&apos;a {MAX_STARTUPS_PER_USER} profils startup et garde-les a jour.
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
            <p className="text-sm text-foreground-muted">Vous n&apos;avez pas encore de startup.</p>
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
              const isPublishing = publishingStartupId === startup.id;
              const isUploadingPitchDeck = uploadingPitchDeckId === startup.id;
              const isDownloadingPitchDeck = downloadingPitchDeckId === startup.id;
              // Le backend cree toujours un profil en DRAFT ; un statut absent
              // (objet pas encore rafraichi) est donc traite comme un brouillon.
              const isPublished = startup.status === "PUBLISHED";
              const hasPitchDeck = Boolean(startup.pitchDeckOriginalName);
              const hasLogo = Boolean(startup.logoOriginalName);
              const isUploadingLogo = uploadingLogoId === startup.id;
              const fieldPrefix = `${formIdPrefix}-pitch-deck-${startup.id}`;

              return (
                <article
                  className="dashboard-card group p-4"
                  key={startup.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{startup.startupName}</h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isPublished ? "Publiée" : "Brouillon"}
                        </span>
                      </div>
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

                  <div className="mt-4 rounded-xl border border-border/70 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-foreground-muted">
                      Pitch deck
                    </p>

                    {hasPitchDeck ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-foreground">
                          {startup.pitchDeckOriginalName}
                          {startup.pitchDeckSize ? ` (${formatFileSize(startup.pitchDeckSize)})` : ""}
                        </span>
                        <button
                          className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={isDownloadingPitchDeck}
                          onClick={() => void handleDownloadPitchDeck(startup)}
                          type="button"
                        >
                          {isDownloadingPitchDeck ? "Telechargement..." : "Telecharger"}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-foreground-muted">Aucun pitch deck televerse.</p>
                    )}

                    <label className="mt-3 block text-sm" htmlFor={fieldPrefix}>
                      <span className="sr-only">
                        {hasPitchDeck ? "Remplacer le pitch deck" : "Televerser un pitch deck"}
                      </span>
                      <input
                        accept={PITCH_DECK_ACCEPT}
                        className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-brand/35 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isUploadingPitchDeck}
                        id={fieldPrefix}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void handlePitchDeckChange(startup, file);
                        }}
                        type="file"
                      />
                    </label>
                    {isUploadingPitchDeck && (
                      <p className="mt-1 text-xs text-foreground-muted">Televersement en cours...</p>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-border/70 bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.1em] text-foreground-muted">
                      Logo
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <StartupLogo
                        hasLogo={hasLogo}
                        startupId={startup.id}
                        startupName={startup.startupName}
                      />
                      {/* `logoSize` et `logoUploadedAt` etaient ecrits en base et
                          declares dans le type, mais affiches nulle part : on les
                          rend ici, comme pour le pitch deck. */}
                      <span className="text-sm text-foreground-muted">
                        {hasLogo
                          ? [
                              startup.logoOriginalName,
                              formatFileSize(startup.logoSize),
                              formatUploadDate(startup.logoUploadedAt)
                                ? `ajoute le ${formatUploadDate(startup.logoUploadedAt)}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" - ")
                          : "Aucun logo televerse."}
                      </span>
                    </div>

                    <label className="mt-3 block text-sm" htmlFor={`${fieldPrefix}-logo`}>
                      <span className="sr-only">
                        {hasLogo ? "Remplacer le logo" : "Televerser un logo"}
                      </span>
                      <input
                        accept=".png,.jpg,.jpeg,.webp"
                        className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-brand/35 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isUploadingLogo}
                        id={`${fieldPrefix}-logo`}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void handleLogoChange(startup, file);
                        }}
                        type="file"
                      />
                    </label>
                    {isUploadingLogo && (
                      <p className="mt-1 text-xs text-foreground-muted">Televersement en cours...</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                      onClick={() => openEditForm(startup)}
                      type="button"
                    >
                      Modifier
                    </button>
                    {!isPublished && (
                      <button
                        className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isPublishing}
                        onClick={() => void handlePublish(startup)}
                        type="button"
                      >
                        {isPublishing ? "Publication..." : "Publier"}
                      </button>
                    )}
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
            maxLength={100}
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
            maxLength={100}
            onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
            placeholder="Secteur"
            type="text"
            value={form.sector}
          />
        </FormField>

        <FormField htmlFor={fieldId("stage")} label="Stade">
          <FormInput
            id={fieldId("stage")}
            maxLength={50}
            onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
            placeholder="Stade"
            type="text"
            value={form.stage}
          />
        </FormField>

        <FormField htmlFor={fieldId("website")} label="Site web">
          <FormInput
            id={fieldId("website")}
            maxLength={255}
            onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            placeholder="https://votre-site.com"
            type="url"
            value={form.website}
          />
        </FormField>

        <FormField htmlFor={fieldId("linkedinUrl")} label="Page LinkedIn">
          <FormInput
            id={fieldId("linkedinUrl")}
            maxLength={255}
            onChange={(event) =>
              setForm((current) => ({ ...current, linkedinUrl: event.target.value }))
            }
            placeholder="https://www.linkedin.com/company/..."
            type="url"
            value={form.linkedinUrl}
          />
        </FormField>

        <FormField
          hint="Deck heberge ailleurs (DocSend, Notion...). Ne remplace pas le pitch deck depose."
          htmlFor={fieldId("deckUrl")}
          label="Lien vers un deck externe"
        >
          <FormInput
            id={fieldId("deckUrl")}
            maxLength={255}
            onChange={(event) =>
              setForm((current) => ({ ...current, deckUrl: event.target.value }))
            }
            placeholder="https://docsend.com/view/..."
            type="url"
            value={form.deckUrl}
          />
        </FormField>

        <FormCheckbox
          checked={form.isPublicShowcase}
          hint="Sans effet tant que votre startup n'est pas entree en incubation. Seuls le nom, le logo, la description, le secteur, le stade et vos liens publics seraient affiches."
          label="Figurer sur la vitrine publique de l'incubateur"
          onChange={(event) =>
            setForm((current) => ({ ...current, isPublicShowcase: event.target.checked }))
          }
        />

        <FormField htmlFor={fieldId("description")} label="Description">
          <FormTextarea
            id={fieldId("description")}
            maxLength={1000}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Decrivez votre startup"
            value={form.description}
          />
        </FormField>

        <FormField
          hint={
            !pitchDeckFile && editingStartupForPitchDeckHint?.pitchDeckOriginalName
              ? `Fichier actuel : ${editingStartupForPitchDeckHint.pitchDeckOriginalName}. Choisissez un fichier pour le remplacer.`
              : undefined
          }
          htmlFor={fieldId("pitchDeck")}
          label="Pitch deck"
        >
          <input
            accept={PITCH_DECK_ACCEPT}
            className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-brand/35"
            id={fieldId("pitchDeck")}
            onChange={(event) => setPitchDeckFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          {pitchDeckFile && (
            <p className="text-xs text-foreground-muted">Selectionne : {pitchDeckFile.name}</p>
          )}
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

      <ConfirmDialog
        cancelLabel="Completer les donnees"
        confirmLabel="Enregistrer comme brouillon"
        description={
          pendingIncompleteSave
            ? `Il manque : ${pendingIncompleteSave}. Vous pouvez enregistrer comme brouillon et completer ces informations plus tard, ou revenir au formulaire pour les ajouter maintenant.`
            : undefined
        }
        isConfirming={isSaving}
        isOpen={Boolean(pendingIncompleteSave)}
        onCancel={cancelIncompleteSave}
        onConfirm={() => void performSave()}
        title="Profil incomplet"
      />
    </RoleGuard>
  );
}
