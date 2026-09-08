"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
import ConfirmDialog from "@/src/components/dashboard/ConfirmDialog";
import { useAuth } from "@/src/contexts/AuthContext";
import { useUsers } from "@/src/contexts/UserContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import type { User } from "@/src/types/user";
import AdminUsersTable from "./users/AdminUsersTable";
import CreateUserModal, { type CreateUserFormValues } from "./users/CreateUserModal";
import EditUserModal, { type EditUserFormValues } from "./users/EditUserModal";

type AccountStatusConfirmationState = {
  id: string;
  email: string;
  action: "ACTIVATE" | "DEACTIVATE";
};

const emptyCreateForm: CreateUserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "STARTUP",
};

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

  const [createForm, setCreateForm] = useState<CreateUserFormValues>(emptyCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditUserFormValues | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [statusLoadingUserId, setStatusLoadingUserId] = useState<string | null>(null);
  const [accountStatusConfirmation, setAccountStatusConfirmation] =
    useState<AccountStatusConfirmationState | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  useAutoRefresh(refreshUsers, {
    enabled: isAuthReady && isAuthenticated,
    intervalMs: 60000,
    refreshOnFocus: true,
    refreshOnVisibility: true,
  });

  const resetActionFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openCreateModal = () => {
    clearUsersError();
    resetActionFeedback();
    setCreateForm(emptyCreateForm);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
  };

  const mapUserToEditForm = (user: User): EditUserFormValues => ({
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

      setCreateForm(emptyCreateForm);
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

        <AdminUsersTable
          error={!isUsersLoading ? usersError : null}
          hasSearchTerm={Boolean(searchTerm.trim())}
          isLoading={isUsersLoading}
          onEdit={startEdit}
          onToggleStatus={handleToggleAccountStatus}
          statusLoadingUserId={statusLoadingUserId}
          users={filteredUsers}
        />
      </section>

      <EditUserModal
        error={actionError}
        isSubmitting={Boolean(editingUserId)}
        onChange={setEditForm}
        onClose={cancelEdit}
        onSubmit={handleUpdateUser}
        values={editForm}
      />

      <CreateUserModal
        error={actionError}
        isOpen={isCreateModalOpen}
        isSubmitting={isCreating}
        onChange={setCreateForm}
        onClose={closeCreateModal}
        onSubmit={handleCreateUser}
        values={createForm}
      />

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
