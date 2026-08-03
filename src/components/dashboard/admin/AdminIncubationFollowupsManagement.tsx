"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Target,
} from "lucide-react";
import RoleGuard from "@/src/components/auth/Roleguard";
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
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useIncubationFollowups } from "@/src/contexts/IncubationFollowupsContext";
import type { Application } from "@/src/types/application";
import type {
  FollowUpObjective,
  FollowUpObjectivePriority,
  FollowUpObjectiveStatus,
  FollowUpPhase,
  FollowUpStatus,
  IncubationFollowUp,
} from "@/src/types/incubation-followups";

const followUpStatuses: FollowUpStatus[] = ["ACTIVE", "COMPLETED", "SUSPENDED", "DROPPED"];
const objectiveStatuses: FollowUpObjectiveStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
const objectivePriorities: FollowUpObjectivePriority[] = ["LOW", "MEDIUM", "HIGH"];

const followUpStatusLabels: Record<FollowUpStatus, string> = {
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

type ObjectiveFormState = {
  title: string;
  description: string;
  priority: FollowUpObjectivePriority;
  status: FollowUpObjectiveStatus;
  progress: string;
  deadlineAt: string;
};

const emptyObjectiveForm: ObjectiveFormState = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  progress: "0",
  deadlineAt: "",
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

function toDateInputValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getApplicationLabel(application: Application): string {
  const startup = application.startup?.startupName || application.startupId;
  const program = application.program?.title || application.programId;
  return `${startup} — ${program}`;
}

function getFollowUpLabel(followUp: IncubationFollowUp): string {
  return followUp.startup?.startupName || followUp.startupId;
}

function getReportedProgress(followUp: IncubationFollowUp): number {
  const latestReportedProgress = followUp.updates?.find(
    (update) => typeof update.progress === "number",
  )?.progress;

  return clampProgress(latestReportedProgress ?? followUp.progress ?? 0);
}

function followUpStatusClass(status: FollowUpStatus): string {
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

export default function AdminIncubationFollowupsManagement() {
  const fieldIdPrefix = useId();
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

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Suivis actifs", value: summary.active, icon: Activity },
              { label: "Suivis terminés", value: summary.completed, icon: CheckCircle2 },
              { label: "Objectifs", value: summary.objectives, icon: Target },
              {
                label: "Objectifs réalisés",
                value: summary.completedObjectives,
                icon: ClipboardPlus,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <article className="dashboard-card p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                    </div>
                    <span className="rounded-xl bg-orange-50 p-2.5 text-brand-strong">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-surface p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Démarrer un suivi</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Seules les candidatures acceptées sans suivi existant sont proposées.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[32rem] md:flex-row">
              <FormSelect
                aria-label="Candidature acceptée"
                disabled={isCreatingFollowUp || availableApplications.length === 0}
                onChange={(event) => setApplicationId(event.target.value)}
                value={applicationId}
              >
                <option value="">
                  {availableApplications.length === 0
                    ? "Aucune candidature disponible"
                    : "Sélectionner une candidature"}
                </option>
                {availableApplications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {getApplicationLabel(application)}
                  </option>
                ))}
              </FormSelect>
              <Button
                disabled={!applicationId || isCreatingFollowUp}
                onClick={() => void handleCreateFollowUp()}
                type="button"
              >
                <Plus className="h-4 w-4" />
                {isCreatingFollowUp ? "Création..." : "Créer le suivi"}
              </Button>
            </div>
          </div>

          {(actionError || applicationsError || followUpsError) && (
            <FormErrorMessage
              className="mt-4"
              message={actionError || applicationsError || followUpsError}
            />
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="dashboard-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Dossiers suivis</h2>
              <span className="text-sm text-foreground-muted">{filteredFollowUps.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-white px-3">
                <Search className="h-4 w-4 text-foreground-muted" />
                <input
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Startup ou programme..."
                  type="search"
                  value={searchQuery}
                />
              </div>
              <FormSelect
                aria-label="Filtrer par statut"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | FollowUpStatus)
                }
                value={statusFilter}
              >
                <option value="ALL">Tous les statuts</option>
                {followUpStatuses.map((status) => (
                  <option key={status} value={status}>
                    {followUpStatusLabels[status]}
                  </option>
                ))}
              </FormSelect>
            </div>

            {isFollowUpsLoading && (
              <div className="mt-4 space-y-2">
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              </div>
            )}

            {!isFollowUpsLoading && filteredFollowUps.length === 0 && (
              <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
                Aucun suivi ne correspond aux critères.
              </p>
            )}

            <div className="mt-4 max-h-[42rem] space-y-2 overflow-y-auto pr-1">
              {filteredFollowUps.map((followUp) => {
                const status = followUp.status || "ACTIVE";
                const isActive = followUp.id === activeFollowUpId;
                const progress = getReportedProgress(followUp);

                return (
                  <button
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? "border-brand/50 bg-orange-50/80 shadow-sm"
                        : "border-border/70 bg-white/85 hover:border-brand/30"
                    }`}
                    key={followUp.id}
                    onClick={() => setSelectedFollowUpId(followUp.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {getFollowUpLabel(followUp)}
                        </p>
                        <p className="mt-1 truncate text-xs text-foreground-muted">
                          {followUp.program?.title || followUp.programId}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${followUpStatusClass(status)}`}
                      >
                        {followUpStatusLabels[status]}
                      </span>
                    </div>
                    <Progress
                      className="mt-3"
                      indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
                      value={progress}
                    />
                    <p className="mt-1 text-right text-[11px] text-foreground-muted">
                      {progress} %
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

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
                <section className="dashboard-surface p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge>Fiche d’incubation</Badge>
                      <h2 className="mt-3 text-2xl font-semibold text-foreground">
                        {getFollowUpLabel(activeFollowUp)}
                      </h2>
                      <p className="mt-1 text-sm text-foreground-muted">
                        {activeFollowUp.program?.title || activeFollowUp.programId}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${followUpStatusClass(activeFollowUp.status || "ACTIVE")}`}
                    >
                      {followUpStatusLabels[activeFollowUp.status || "ACTIVE"]}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="dashboard-soft-block p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        Phase
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {phaseLabels[activeFollowUp.phase || "ONBOARDING"]}
                      </p>
                    </article>
                    <article className="dashboard-soft-block p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        Démarrage
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatDate(activeFollowUp.startDate)}
                      </p>
                    </article>
                    <article className="dashboard-soft-block p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        Objectifs
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {activeFollowUp.objectives?.length || 0}
                      </p>
                    </article>
                    <article className="dashboard-soft-block p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-foreground-muted">
                        Comptes rendus
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {activeFollowUp.updates?.length || 0}
                      </p>
                    </article>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Progression globale</span>
                      <span className="text-foreground-muted">
                        {getReportedProgress(activeFollowUp)} %
                      </span>
                    </div>
                    <Progress
                      className="h-3"
                      indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400"
                      value={getReportedProgress(activeFollowUp)}
                    />
                  </div>

                  {activeFollowUp.notes && (
                    <p className="mt-5 rounded-xl border border-border/70 bg-white p-4 text-sm text-foreground-muted">
                      {activeFollowUp.notes}
                    </p>
                  )}
                </section>

                <section className="dashboard-surface p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Objectifs</h2>
                      <p className="mt-1 text-sm text-foreground-muted">
                        Cadrez les livrables et suivez leur avancement.
                      </p>
                    </div>
                    <Button onClick={openCreateObjective} size="sm" type="button">
                      <Plus className="h-4 w-4" />
                      Ajouter un objectif
                    </Button>
                  </div>

                  {(activeFollowUp.objectives?.length || 0) === 0 && (
                    <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
                      Aucun objectif défini pour ce suivi.
                    </p>
                  )}

                  <div className="mt-4 grid gap-3">
                    {(activeFollowUp.objectives || []).map((objective) => {
                      const status = objective.status || "TODO";
                      const priority = objective.priority || "MEDIUM";

                      return (
                        <article className="dashboard-card p-4" key={objective.id}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-foreground">{objective.title}</h3>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${objectiveStatusClass(status)}`}
                                >
                                  {objectiveStatusLabels[status]}
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
                              onClick={() => openEditObjective(objective)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Modifier
                            </Button>
                          </div>

                          <div className="mt-4">
                            <div className="mb-1.5 flex items-center justify-between text-xs text-foreground-muted">
                              <span>Progression</span>
                              <span>{objective.progress ?? 0} %</span>
                            </div>
                            <Progress
                              indicatorClassName={
                                status === "BLOCKED"
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
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Journal d’avancement</h2>
                    <p className="mt-1 text-sm text-foreground-muted">
                      Comptes rendus publiés par la startup, du plus récent au plus ancien.
                    </p>
                  </div>

                  {(activeFollowUp.updates?.length || 0) === 0 && (
                    <p className="mt-4 rounded-xl border border-border/75 bg-white p-4 text-sm text-foreground-muted">
                      Aucun compte rendu transmis.
                    </p>
                  )}

                  <div className="mt-5 space-y-4">
                    {(activeFollowUp.updates || []).map((update) => (
                      <article className="relative border-l-2 border-orange-200 pl-5" key={update.id}>
                        <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand" />
                        <div className="dashboard-card p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {update.title || "Point d’avancement"}
                              </h3>
                              <p className="mt-1 text-xs text-foreground-muted">
                                {update.author?.email || "Startup"} · {formatDate(update.createdAt, true)}
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
                              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
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
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">
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
              </>
            )}
          </div>
        </section>
      </div>

      <FormModal
        description={
          editingObjective
            ? "Modifiez le contenu, le statut et la progression de cet objectif."
            : "Définissez un objectif clair et mesurable pour la startup."
        }
        isBusy={isSavingObjective}
        isOpen={isObjectiveModalOpen}
        onClose={closeObjectiveModal}
        onSubmit={handleObjectiveSubmit}
        title={editingObjective ? "Modifier l’objectif" : "Ajouter un objectif"}
      >
        <FormErrorMessage message={actionError} />

        <div className="grid gap-4">
          <FormField
            htmlFor={`${fieldIdPrefix}-objective-title`}
            label="Titre"
            required
          >
            <FormInput
              disabled={isSavingObjective}
              id={`${fieldIdPrefix}-objective-title`}
              maxLength={160}
              onChange={(event) =>
                setObjectiveForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Ex. Valider la proposition de valeur"
              required
              value={objectiveForm.title}
            />
          </FormField>

          <FormField
            htmlFor={`${fieldIdPrefix}-objective-description`}
            label="Description"
          >
            <FormTextarea
              disabled={isSavingObjective}
              id={`${fieldIdPrefix}-objective-description`}
              onChange={(event) =>
                setObjectiveForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Résultat attendu et critères de réussite..."
              value={objectiveForm.description}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              htmlFor={`${fieldIdPrefix}-objective-priority`}
              label="Priorité"
              required
            >
              <FormSelect
                disabled={isSavingObjective}
                id={`${fieldIdPrefix}-objective-priority`}
                onChange={(event) =>
                  setObjectiveForm((current) => ({
                    ...current,
                    priority: event.target.value as FollowUpObjectivePriority,
                  }))
                }
                value={objectiveForm.priority}
              >
                {objectivePriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField
              htmlFor={`${fieldIdPrefix}-objective-deadline`}
              label="Échéance"
            >
              <FormInput
                disabled={isSavingObjective}
                id={`${fieldIdPrefix}-objective-deadline`}
                onChange={(event) =>
                  setObjectiveForm((current) => ({
                    ...current,
                    deadlineAt: event.target.value,
                  }))
                }
                type="date"
                value={objectiveForm.deadlineAt}
              />
            </FormField>
          </div>

          {editingObjective && (
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
                    setObjectiveForm((current) => ({
                      ...current,
                      status: event.target.value as FollowUpObjectiveStatus,
                    }))
                  }
                  value={objectiveForm.status}
                >
                  {objectiveStatuses.map((status) => (
                    <option key={status} value={status}>
                      {objectiveStatusLabels[status]}
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
                  onChange={(event) =>
                    setObjectiveForm((current) => ({
                      ...current,
                      progress: event.target.value,
                    }))
                  }
                  required
                  type="number"
                  value={objectiveForm.progress}
                />
              </FormField>
            </div>
          )}
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
    </RoleGuard>
  );
}
