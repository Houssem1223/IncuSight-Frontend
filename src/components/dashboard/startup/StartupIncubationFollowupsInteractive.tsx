"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquarePlus,
  Pencil,
  Target,
  TriangleAlert,
} from "lucide-react";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormSelect,
  FormTextarea,
} from "@/src/components/ui/forms";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import type {
  FollowUpObjective,
  FollowUpObjectivePriority,
  FollowUpObjectiveStatus,
  FollowUpPhase,
  FollowUpStatus,
  IncubationFollowUp,
} from "@/src/types/incubation-followups";

type StartupIncubationFollowupsInteractiveProps = {
  followUp: IncubationFollowUp;
};

type UpdateFormState = {
  title: string;
  done: string;
  blockers: string;
  needs: string;
  nextSteps: string;
  progress: string;
};

const objectiveStatuses: FollowUpObjectiveStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];

const statusLabels: Record<FollowUpStatus, string> = {
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  SUSPENDED: "Suspendu",
  DROPPED: "Abandonné",
};

const phaseLabels: Record<FollowUpPhase, string> = {
  ONBOARDING: "Intégration",
  DIAGNOSTIC: "Diagnostic",
  BUILD: "Construction",
  MARKET_VALIDATION: "Validation marché",
  PITCH_PREPARATION: "Préparation du pitch",
  CLOSING: "Clôture",
};

const objectiveStatusLabels: Record<FollowUpObjectiveStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
  BLOCKED: "Bloqué",
};

const priorityLabels: Record<FollowUpObjectivePriority, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
};

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function formatDate(value?: string | null, includeTime = false): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function statusClass(status: FollowUpStatus): string {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SUSPENDED" || status === "DROPPED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function objectiveStatusClass(status: FollowUpObjectiveStatus): string {
  if (status === "DONE") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "BLOCKED") {
    return "bg-red-50 text-red-700";
  }

  if (status === "IN_PROGRESS") {
    return "bg-sky-50 text-sky-700";
  }

  return "bg-amber-50 text-amber-700";
}

function getReportedProgress(followUp: IncubationFollowUp): number {
  const latestReportedProgress = followUp.updates?.find(
    (update) => typeof update.progress === "number",
  )?.progress;

  return clampProgress(latestReportedProgress ?? followUp.progress ?? 0);
}

export default function StartupIncubationFollowupsInteractive({
  followUp,
}: StartupIncubationFollowupsInteractiveProps) {
  const fieldIdPrefix = useId();
  const { updateObjectiveByStartup, addUpdate } = useIncubationFollowups();
  const [objectiveToUpdate, setObjectiveToUpdate] = useState<FollowUpObjective | null>(null);
  const [objectiveStatus, setObjectiveStatus] = useState<FollowUpObjectiveStatus>("TODO");
  const [objectiveProgress, setObjectiveProgress] = useState("0");
  const [isSavingObjective, setIsSavingObjective] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState<UpdateFormState>({
    title: "",
    done: "",
    blockers: "",
    needs: "",
    nextSteps: "",
    progress: String(getReportedProgress(followUp)),
  });
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const objectiveSummary = useMemo(() => {
    const objectives = followUp.objectives || [];

    return {
      total: objectives.length,
      done: objectives.filter((objective) => objective.status === "DONE").length,
      blocked: objectives.filter((objective) => objective.status === "BLOCKED").length,
    };
  }, [followUp.objectives]);

  const openObjectiveModal = (objective: FollowUpObjective) => {
    setObjectiveToUpdate(objective);
    setObjectiveStatus(objective.status || "TODO");
    setObjectiveProgress(String(objective.progress ?? 0));
    setActionError("");
    setSuccessMessage("");
  };

  const closeObjectiveModal = () => {
    if (isSavingObjective) {
      return;
    }

    setObjectiveToUpdate(null);
    setActionError("");
  };

  const handleObjectiveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!objectiveToUpdate) {
      return;
    }

    setIsSavingObjective(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await updateObjectiveByStartup(objectiveToUpdate.id, {
        status: objectiveStatus,
        progress: clampProgress(Number(objectiveProgress)),
      });
      setObjectiveToUpdate(null);
      setSuccessMessage("La progression de l’objectif a été mise à jour.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de mettre à jour l’objectif.",
      );
    } finally {
      setIsSavingObjective(false);
    }
  };

  const openUpdateModal = () => {
    setUpdateForm({
      title: "",
      done: "",
      blockers: "",
      needs: "",
      nextSteps: "",
      progress: String(getReportedProgress(followUp)),
    });
    setActionError("");
    setSuccessMessage("");
    setIsUpdateModalOpen(true);
  };

  const closeUpdateModal = () => {
    if (isSavingUpdate) {
      return;
    }

    setIsUpdateModalOpen(false);
    setActionError("");
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const done = updateForm.done.trim();

    if (!done) {
      setActionError("Indiquez ce qui a été réalisé depuis le dernier point.");
      return;
    }

    setIsSavingUpdate(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await addUpdate(followUp.id, {
        ...(updateForm.title.trim() ? { title: updateForm.title.trim() } : {}),
        done,
        ...(updateForm.blockers.trim() ? { blockers: updateForm.blockers.trim() } : {}),
        ...(updateForm.needs.trim() ? { needs: updateForm.needs.trim() } : {}),
        ...(updateForm.nextSteps.trim()
          ? { nextSteps: updateForm.nextSteps.trim() }
          : {}),
        progress: clampProgress(Number(updateForm.progress)),
      });
      setIsUpdateModalOpen(false);
      setSuccessMessage("Votre compte rendu a été publié.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Impossible de publier le compte rendu.",
      );
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const status = followUp.status || "ACTIVE";
  const phase = followUp.phase || "ONBOARDING";
  const reportedProgress = getReportedProgress(followUp);

  return (
    <div className="min-w-0 space-y-6">
      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      <section className="dashboard-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge>Parcours d’incubation</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">
              {followUp.program?.title || followUp.programId}
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {followUp.startup?.startupName || followUp.startupId}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(status)}`}
          >
            {statusLabels[status]}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">Phase</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{phaseLabels[phase]}</p>
          </article>
          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
              Démarrage
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatDate(followUp.startDate)}
            </p>
          </article>
          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
              Objectifs réalisés
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {objectiveSummary.done} / {objectiveSummary.total}
            </p>
          </article>
          <article className="dashboard-soft-block p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
              Objectifs bloqués
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {objectiveSummary.blocked}
            </p>
          </article>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progression globale</span>
            <span className="text-foreground-muted">{reportedProgress} %</span>
          </div>
          <Progress
            className="h-3"
            indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
            value={reportedProgress}
          />
        </div>

        {followUp.notes && (
          <p className="mt-5 rounded-xl border border-border/70 bg-white p-4 text-sm text-foreground-muted">
            {followUp.notes}
          </p>
        )}
      </section>

      <section className="dashboard-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mes objectifs</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Mettez à jour le statut et la progression à mesure que vous avancez.
            </p>
          </div>
          <Target className="h-6 w-6 text-brand" />
        </div>

        {(followUp.objectives?.length || 0) === 0 && (
          <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
            Aucun objectif n’a encore été défini par l’équipe d’incubation.
          </p>
        )}

        <div className="mt-4 grid gap-3">
          {(followUp.objectives || []).map((objective) => {
            const objectiveStatus = objective.status || "TODO";
            const priority = objective.priority || "MEDIUM";

            return (
              <article className="dashboard-card p-4" key={objective.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{objective.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${objectiveStatusClass(objectiveStatus)}`}
                      >
                        {objectiveStatusLabels[objectiveStatus]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                        Priorité {priorityLabels[priority].toLocaleLowerCase("fr")}
                      </span>
                    </div>
                    {objective.description && (
                      <p className="mt-2 text-sm text-foreground-muted">
                        {objective.description}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => openObjectiveModal(objective)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Mettre à jour
                  </Button>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-foreground-muted">
                    <span>Progression</span>
                    <span>{objective.progress ?? 0} %</span>
                  </div>
                  <Progress
                    indicatorClassName={
                      objectiveStatus === "BLOCKED"
                        ? "bg-red-500"
                        : "bg-gradient-to-r from-orange-500 to-amber-400"
                    }
                    value={objective.progress ?? 0}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Échéance : {formatDate(objective.deadlineAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Mis à jour : {formatDate(objective.updatedAt, true)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Journal d’avancement</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Partagez un point régulier avec vos réalisations, obstacles et besoins.
            </p>
          </div>
          <Button onClick={openUpdateModal} size="sm" type="button">
            <MessageSquarePlus className="h-4 w-4" />
            Nouveau compte rendu
          </Button>
        </div>

        {(followUp.updates?.length || 0) === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-white/75 p-6 text-center">
            <MessageSquarePlus className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-2 text-sm font-medium text-foreground">
              Aucun compte rendu pour le moment
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              Publiez votre premier point d’avancement pour informer l’équipe.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {(followUp.updates || []).map((update) => (
            <article className="relative border-l-2 border-orange-200 pl-5" key={update.id}>
              <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand" />
              <div className="dashboard-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {update.title || "Point d’avancement"}
                    </h3>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {formatDate(update.createdAt, true)}
                    </p>
                  </div>
                  {typeof update.progress === "number" && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-brand-strong">
                      {update.progress} %
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50/70 p-3">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Réalisé
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{update.done}</p>
                  </div>

                  {update.nextSteps && (
                    <div className="rounded-xl bg-sky-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
                        Prochaines étapes
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{update.nextSteps}</p>
                    </div>
                  )}

                  {update.blockers && (
                    <div className="rounded-xl bg-red-50/70 p-3">
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        Blocages
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{update.blockers}</p>
                    </div>
                  )}

                  {update.needs && (
                    <div className="rounded-xl bg-amber-50/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-700">
                        Besoins
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{update.needs}</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FormModal
        description="Vous pouvez uniquement modifier le statut et la progression de cet objectif."
        isBusy={isSavingObjective}
        isOpen={Boolean(objectiveToUpdate)}
        onClose={closeObjectiveModal}
        onSubmit={handleObjectiveSubmit}
        title={objectiveToUpdate?.title || "Mettre à jour l’objectif"}
      >
        <FormErrorMessage message={actionError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            htmlFor={`${fieldIdPrefix}-objective-status`}
            label="Statut"
            required
          >
            <FormSelect
              disabled={isSavingObjective}
              id={`${fieldIdPrefix}-objective-status`}
              onChange={(event) =>
                setObjectiveStatus(event.target.value as FollowUpObjectiveStatus)
              }
              value={objectiveStatus}
            >
              {objectiveStatuses.map((item) => (
                <option key={item} value={item}>
                  {objectiveStatusLabels[item]}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField
            htmlFor={`${fieldIdPrefix}-objective-progress`}
            label="Progression (%)"
            required
          >
            <FormInput
              disabled={isSavingObjective}
              id={`${fieldIdPrefix}-objective-progress`}
              max={100}
              min={0}
              onChange={(event) => setObjectiveProgress(event.target.value)}
              required
              type="number"
              value={objectiveProgress}
            />
          </FormField>
        </div>

        <FormActions>
          <Button
            disabled={isSavingObjective}
            onClick={closeObjectiveModal}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button disabled={isSavingObjective} type="submit">
            {isSavingObjective ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </FormActions>
      </FormModal>

      <FormModal
        description="Ce compte rendu sera visible par l’équipe d’incubation."
        isBusy={isSavingUpdate}
        isOpen={isUpdateModalOpen}
        maxWidthClassName="max-w-3xl"
        onClose={closeUpdateModal}
        onSubmit={handleUpdateSubmit}
        title="Nouveau compte rendu"
      >
        <FormErrorMessage message={actionError} />

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <FormField htmlFor={`${fieldIdPrefix}-update-title`} label="Titre">
            <FormInput
              disabled={isSavingUpdate}
              id={`${fieldIdPrefix}-update-title`}
              maxLength={160}
              onChange={(event) =>
                setUpdateForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ex. Point hebdomadaire — semaine 3"
              value={updateForm.title}
            />
          </FormField>

          <FormField
            htmlFor={`${fieldIdPrefix}-update-done`}
            label="Travail réalisé"
            required
          >
            <FormTextarea
              disabled={isSavingUpdate}
              id={`${fieldIdPrefix}-update-done`}
              onChange={(event) =>
                setUpdateForm((current) => ({ ...current, done: event.target.value }))
              }
              placeholder="Décrivez les actions et livrables réalisés..."
              required
              value={updateForm.done}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              htmlFor={`${fieldIdPrefix}-update-blockers`}
              label="Blocages rencontrés"
            >
              <FormTextarea
                className="min-h-24"
                disabled={isSavingUpdate}
                id={`${fieldIdPrefix}-update-blockers`}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    blockers: event.target.value,
                  }))
                }
                placeholder="Freins techniques, commerciaux..."
                value={updateForm.blockers}
              />
            </FormField>

            <FormField htmlFor={`${fieldIdPrefix}-update-needs`} label="Besoins">
              <FormTextarea
                className="min-h-24"
                disabled={isSavingUpdate}
                id={`${fieldIdPrefix}-update-needs`}
                onChange={(event) =>
                  setUpdateForm((current) => ({ ...current, needs: event.target.value }))
                }
                placeholder="Expertise, mise en relation, ressources..."
                value={updateForm.needs}
              />
            </FormField>
          </div>

          <FormField
            htmlFor={`${fieldIdPrefix}-update-next-steps`}
            label="Prochaines étapes"
          >
            <FormTextarea
              className="min-h-24"
              disabled={isSavingUpdate}
              id={`${fieldIdPrefix}-update-next-steps`}
              onChange={(event) =>
                setUpdateForm((current) => ({
                  ...current,
                  nextSteps: event.target.value,
                }))
              }
              placeholder="Actions prévues avant le prochain point..."
              value={updateForm.nextSteps}
            />
          </FormField>

          <FormField
            htmlFor={`${fieldIdPrefix}-update-progress`}
            hint="Estimation globale de l’avancement du parcours."
            label="Progression globale estimée (%)"
          >
            <FormInput
              disabled={isSavingUpdate}
              id={`${fieldIdPrefix}-update-progress`}
              max={100}
              min={0}
              onChange={(event) =>
                setUpdateForm((current) => ({ ...current, progress: event.target.value }))
              }
              type="number"
              value={updateForm.progress}
            />
          </FormField>
        </div>

        <FormActions>
          <Button
            disabled={isSavingUpdate}
            onClick={closeUpdateModal}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button disabled={isSavingUpdate} type="submit">
            {isSavingUpdate ? "Publication..." : "Publier le compte rendu"}
          </Button>
        </FormActions>
      </FormModal>
    </div>
  );
}
