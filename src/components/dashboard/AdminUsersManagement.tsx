"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import RoleGuard from "@/src/components/auth/Roleguard";
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
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [statusLoadingUserId, setStatusLoadingUserId] = useState<string | null>(null);
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
      setActionMessage("User created successfully.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (user: User) => {
    resetActionFeedback();
    setEditForm(mapUserToEditForm(user));
  };

  const cancelEdit = () => {
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

      setActionMessage("User updated successfully.");
      setEditForm(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setEditingUserId(null);
    }
  };

  const handleToggleAccountStatus = async (user: User) => {
    resetActionFeedback();
    setStatusLoadingUserId(user.id);

    try {
      if (user.isActive === false) {
        await activateAccount(user.id);
        setActionMessage(`User ${user.email} activated.`);
      } else {
        await deactivateAccount(user.id);
        setActionMessage(`User ${user.email} deactivated.`);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update status.");
    } finally {
      setStatusLoadingUserId(null);
    }
  };

  return (
    <RoleGuard allowedRole="ADMIN">
      <section className="motion-rise rounded-2xl border border-border/75 bg-white/90 p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-brand-strong">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Users Directory
            </h1>
            <p className="mt-2 text-sm text-foreground-muted">
              {searchTerm.trim()
                ? `Showing ${filteredUsers.length} of ${users.length} users`
                : `Total users: ${users.length}`}
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-foreground-muted">
              Search
            </label>
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name, email, role, status..."
              type="text"
              value={searchTerm}
            />
            
          </div>
        </div>

        <form
          className="mt-6 grid gap-3 rounded-2xl border border-border/75 bg-slate-50/80 p-4 md:grid-cols-6"
          onSubmit={handleCreateUser}
        >
          <h2 className="md:col-span-6 text-base font-semibold text-foreground">Create user</h2>

          <input
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, firstName: event.target.value }))
            }
            placeholder="First name"
            type="text"
            value={createForm.firstName}
          />

          <input
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, lastName: event.target.value }))
            }
            placeholder="Last name"
            type="text"
            value={createForm.lastName}
          />

          <input
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="Email"
            required
            type="email"
            value={createForm.email}
          />

          <input
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            minLength={6}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="Password"
            required
            type="password"
            value={createForm.password}
          />

          <select
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                role: event.target.value as UserRole,
              }))
            }
            value={createForm.role}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </form>

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
          <div className="mt-6 overflow-hidden rounded-xl border border-border/75">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-foreground-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                        {searchTerm.trim() ? "No matching users found." : "No users found."}
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
                            {user.isActive === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                              onClick={() => startEdit(user)}
                              type="button"
                            >
                              Edit
                            </button>

                            <button
                              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={statusLoadingUserId === user.id}
                              onClick={() => {
                                void handleToggleAccountStatus(user);
                              }}
                              type="button"
                            >
                              {statusLoadingUserId === user.id
                                ? "Saving..."
                                : user.isActive === false
                                  ? "Activate"
                                  : "Deactivate"}
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

        {editForm && (
          <form
            className="mt-6 grid gap-3 rounded-2xl border border-border/75 bg-white p-4 md:grid-cols-4"
            onSubmit={handleUpdateUser}
          >
            <h2 className="md:col-span-4 text-base font-semibold text-foreground">Edit user</h2>

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              placeholder="First name"
              type="text"
              value={editForm.firstName}
            />

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              placeholder="Last name"
              type="text"
              value={editForm.lastName}
            />

            <input
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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

            <select
              className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              value={editForm.role}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <div className="md:col-span-4 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand/35 hover:text-brand-strong"
                onClick={cancelEdit}
                type="button"
              >
                Cancel
              </button>

              <button
                className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-contrast transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={editingUserId === editForm.id}
                type="submit"
              >
                {editingUserId === editForm.id ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>
    </RoleGuard>
  );
}
