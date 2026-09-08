"use client";

import type { User } from "@/src/types/user";

type AdminUsersTableProps = {
  users: User[];
  isLoading: boolean;
  error: string | null;
  hasSearchTerm: boolean;
  statusLoadingUserId: string | null;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
};

export default function AdminUsersTable({
  users,
  isLoading,
  error,
  hasSearchTerm,
  statusLoadingUserId,
  onEdit,
  onToggleStatus,
}: AdminUsersTableProps) {
  if (isLoading) {
    return (
      <div className="mt-6 space-y-3">
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  return (
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
            {users.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-foreground-muted" colSpan={5}>
                  {hasSearchTerm ? "Aucun utilisateur correspondant." : "Aucun utilisateur."}
                </td>
              </tr>
            )}

            {users.map((user) => {
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
                        onClick={() => onEdit(user)}
                        type="button"
                      >
                        Modifier
                      </button>

                      <button
                        className="dashboard-btn rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-brand/35 hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={statusLoadingUserId === user.id}
                        onClick={() => onToggleStatus(user)}
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
  );
}
