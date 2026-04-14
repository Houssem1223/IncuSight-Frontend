"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import {
  FormActions,
  FormErrorMessage,
  FormField,
  FormInput,
  FormModal,
  FormSelect,
} from "@/src/components/ui/forms";
import { useAuth } from "@/src/contexts/AuthContext";
import { useUsers } from "@/src/contexts/UserContext";
import type { UserRole } from "@/src/types/auth";
import type { User } from "@/src/types/user";

type CreateFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
};

type EditFormState = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
};

type AccountStatusConfirmationState = {
  id: string;
  email: string;
  action: "ACTIVATE" | "DEACTIVATE";
};

const roleOptions: UserRole[] = ["ADMIN", "STARTUP", "EVALUATOR"];

export default function AdminUsersManagement() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const {
    users,
    isUsersLoading,
    usersError,
    fetchAllUsers,
    clearUsersError,
    createUser,
    updateUserByAdmin,
    activateAccount,
    deactivateAccount,
  } = useUsers();

  const [createForm, setCreateForm] = useState<CreateFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "STARTUP",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [statusLoadingUserId, setStatusLoadingUserId] = useState<string | null>(null);
  const [accountStatusConfirmation, setAccountStatusConfirmation] =
    useState<AccountStatusConfirmationState | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const formIdPrefix = useId();

  const refreshUsers = useCallback(async () => {
    clearUsersError();

    try {
      await fetchAllUsers();
    } catch {
    }
  }, [clearUsersError, fetchAllUsers]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return sortedUsers;
    }

    return sortedUsers.filter((user) => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = user.email.toLowerCase();
      const role = user.role.toLowerCase();
      const status = user.isActive === false ? "inactive" : "active";

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        status.includes(query)
      );
    });
  }, [sortedUsers, searchTerm]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return;
    }

    void refreshUsers();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshUsers();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible,60000);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [isAuthReady, isAuthenticated, refreshUsers]);

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openCreateModal = () => {
    clearUsersError();
    resetActionFeedback();
    setCreateForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "STARTUP",
    });
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
  };

  const mapUserToEditForm = (user: User): EditFormState => ({
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    role: user.role,
  });

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetActionFeedback();
    setIsCreating(true);

    try {
      await createUser({
        firstName: createForm.firstName.trim() || undefined,
        lastName: createForm.lastName.trim() || undefined,
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });

      await refreshUsers();

      setCreateForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "STARTUP",
      });
      setActionMessage("Utilisateur cree avec succes.");
      setIsCreateModalOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de creation de l'utilisateur.");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (user: User) => {
    resetActionFeedback();
    setEditForm(mapUserToEditForm(user));
  };

  const cancelEdit = () => {
    if (editingUserId) {
      return;
    }

    setEditForm(null);
  };

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    resetActionFeedback();
    setEditingUserId(editForm.id);

    try {
      await updateUserByAdmin(editForm.id, {
        firstName: editForm.firstName.trim() || undefined,
        lastName: editForm.lastName.trim() || undefined,
        email: editForm.email.trim(),
        role: editForm.role,
      });

      setActionMessage("Utilisateur mis a jour avec succes.");
      setEditForm(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de mise a jour de l'utilisateur.");
    } finally {
      setEditingUserId(null);
    }
  };

  const handleToggleAccountStatus = (user: User) => {
    resetActionFeedback();
    setAccountStatusConfirmation({
      id: user.id,
      email: user.email,
      action: user.isActive === false ? "ACTIVATE" : "DEACTIVATE",
    });
  };

  const cancelAccountStatusChange = () => {
    if (statusLoadingUserId) {
      return;
    }

    setAccountStatusConfirmation(null);
  };

  const confirmAccountStatusChange = async () => {
    if (!accountStatusConfirmation) {
      return;
    }

    resetActionFeedback();
    setStatusLoadingUserId(accountStatusConfirmation.id);

    try {
      if (accountStatusConfirmation.action === "ACTIVATE") {
        await activateAccount(accountStatusConfirmation.id);
        setActionMessage(`Utilisateur ${accountStatusConfirmation.email} active.`);
      } else {
        await deactivateAccount(accountStatusConfirmation.id);
        setActionMessage(`Utilisateur ${accountStatusConfirmation.email} desactive.`);
      }

      setAccountStatusConfirmation(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Echec de mise a jour du statut.");
    } finally {
      setStatusLoadingUserId(null);
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Gestion des utilisateurs</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {searchTerm.trim()
                ? `${filteredUsers.length} sur ${users.length} utilisateurs affiches`
                : `Total utilisateurs: ${users.length}`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Recherche
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nom, email, role, statut..."
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
            Creer un utilisateur
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

        {isUsersLoading && (
          <div className="mt-6 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        )}

        {!isUsersLoading && usersError && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {usersError}
          </p>
        )}

        {!isUsersLoading && !usersError && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border/75 bg-white/85 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                        {searchTerm.trim() ? "Aucun utilisateur correspondant." : "Aucun utilisateur."}
                      </td>
                    </tr>
                  )}

                  {filteredUsers.map((user) => {
                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

                    return (
                      <tr className="border-t border-border/60" key={user.id}>
                        <td className="px-4 py-3 text-foreground">{fullName || "-"}</td>
                        <td className="px-4 py-3 text-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-foreground-muted">{user.role}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              user.isActive === false
                                ? "bg-red-50 text-red-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {user.isActive === false ? "Inactif" : "Actif"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong"
                              onClick={() => startEdit(user)}
                              type="button"
                            >
                              Modifier
                            </button>

                            <button
                              className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={statusLoadingUserId === user.id}
                              onClick={() => {
                                void handleToggleAccountStatus(user);
                              }}
                              type="button"
                            >
                              {statusLoadingUserId === user.id
                                ? "Enregistrement..."
                                : user.isActive === false
                                  ? "Activer"
                                  : "Desactiver"}
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

      </section>

      {editForm && (
        <FormModal
          description="Mettez a jour les informations du compte."
          isBusy={Boolean(editingUserId)}
          isOpen={Boolean(editForm)}
          onClose={cancelEdit}
          onSubmit={handleUpdateUser}
          title="Modifier utilisateur"
        >
          <FormErrorMessage message={actionError} />

          <FormField htmlFor={editFieldId("firstName")} label="Prenom">
            <FormInput
              autoFocus
              id={editFieldId("firstName")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        firstName: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Prenom"
              type="text"
              value={editForm.firstName}
            />
          </FormField>

          <FormField htmlFor={editFieldId("lastName")} label="Nom">
            <FormInput
              id={editFieldId("lastName")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        lastName: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Nom"
              type="text"
              value={editForm.lastName}
            />
          </FormField>

          <FormField htmlFor={editFieldId("email")} label="Email" required>
            <FormInput
              id={editFieldId("email")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        email: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Email"
              required
              type="email"
              value={editForm.email}
            />
          </FormField>

          <FormField htmlFor={editFieldId("role")} label="Role" required>
            <FormSelect
              id={editFieldId("role")}
              onChange={(event) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        role: event.target.value as UserRole,
                      }
                    : current,
                )
              }
              required
              value={editForm.role}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormActions>
            <button
              className="dashboard-btn rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
              disabled={Boolean(editingUserId)}
              onClick={cancelEdit}
              type="button"
            >
              Annuler
            </button>

            <button
              className="dashboard-btn rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={editingUserId === editForm.id}
              type="submit"
            >
              {editingUserId === editForm.id ? "Enregistrement..." : "Enregistrer"}
            </button>
          </FormActions>
        </FormModal>
      )}

      <FormModal
        description="Formulaire rapide, clair et fluide pour ajouter un compte."
        isBusy={isCreating}
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateUser}
        title="Creer un utilisateur"
      >
        <FormErrorMessage message={actionError} />

        <FormField htmlFor={createFieldId("firstName")} label="Prenom">
          <FormInput
            autoFocus
            id={createFieldId("firstName")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, firstName: event.target.value }))
            }
            placeholder="Prenom"
            type="text"
            value={createForm.firstName}
          />
        </FormField>

        <FormField htmlFor={createFieldId("lastName")} label="Nom">
          <FormInput
            id={createFieldId("lastName")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, lastName: event.target.value }))
            }
            placeholder="Nom"
            type="text"
            value={createForm.lastName}
          />
        </FormField>

        <FormField htmlFor={createFieldId("email")} label="Email" required>
          <FormInput
            id={createFieldId("email")}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="Email"
            required
            type="email"
            value={createForm.email}
          />
        </FormField>

        <FormField htmlFor={createFieldId("password")} label="Mot de passe" required>
          <FormInput
            id={createFieldId("password")}
            minLength={6}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="Mot de passe"
            required
            type="password"
            value={createForm.password}
          />
        </FormField>

        <FormField htmlFor={createFieldId("role")} label="Role" required>
          <FormSelect
            id={createFieldId("role")}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                role: event.target.value as UserRole,
              }))
            }
            required
            value={createForm.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </FormSelect>
        </FormField>

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

      <ConfirmDialog
        cancelLabel="Annuler"
        confirmLabel={
          accountStatusConfirmation?.action === "ACTIVATE" ? "Activer" : "Desactiver"
        }
        description={
          accountStatusConfirmation
            ? accountStatusConfirmation.action === "ACTIVATE"
              ? `Voulez-vous vraiment activer le compte ${accountStatusConfirmation.email} ?`
              : `Voulez-vous vraiment desactiver le compte ${accountStatusConfirmation.email} ?`
            : undefined
        }
        isConfirming={Boolean(
          accountStatusConfirmation && statusLoadingUserId === accountStatusConfirmation.id,
        )}
        isOpen={Boolean(accountStatusConfirmation)}
        onCancel={cancelAccountStatusChange}
        onConfirm={() => {
          void confirmAccountStatusChange();
        }}
        title={
          accountStatusConfirmation?.action === "ACTIVATE"
            ? "Confirmer l'activation ?"
            : "Confirmer la desactivation ?"
        }
        tone={accountStatusConfirmation?.action === "ACTIVATE" ? "brand" : "danger"}
      />
    </RoleGuard>
  );
}
