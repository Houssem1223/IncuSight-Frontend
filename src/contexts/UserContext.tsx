"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, apiFetchWithTotal } from "@/src/lib/api";
import { withPagination, type PaginationParams } from "@/src/lib/pagination";
import { useAuth } from "@/src/contexts/AuthContext";
import type {
  SignupPayload,
  SignupResponse,
  UserRole,
} from "@/src/types/auth";
import type { User } from "@/src/types/user";

type CreateUserPayload = {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
};

type UpdateUserByAdminPayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}>;

type UpdateMyProfilePayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
}>;

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type BackendMessage = {
  message: string;
};

type UserContextType = {
  users: User[];
  usersTotal: number | null;
  isUsersLoading: boolean;
  usersError: string | null;
  clearUsersError: () => void;
  fetchAllUsers: (pagination?: PaginationParams) => Promise<User[]>;
  signup: (payload: SignupPayload) => Promise<SignupResponse>;
  resendVerificationEmail: (email: string) => Promise<BackendMessage>;
  createUser: (payload: CreateUserPayload) => Promise<User>;
  updateUserByAdmin: (id: string, payload: UpdateUserByAdminPayload) => Promise<User>;
  updateMyProfile: (payload: UpdateMyProfilePayload) => Promise<User>;
  activateAccount: (id: string) => Promise<BackendMessage>;
  deactivateAccount: (id: string) => Promise<BackendMessage>;
  deactivateMyAccount: () => Promise<BackendMessage>;
  changeMyPassword: (payload: ChangePasswordPayload) => Promise<BackendMessage>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const clearUsersError = useCallback(() => {
    setUsersError(null);
  }, []);

  const getRequiredToken = useCallback(() => {
    if (!token) {
      throw new Error("No authentication token found.");
    }

    return token;
  }, [token]);

  const upsertUser = useCallback((updatedUser: User) => {
    setUsers((currentUsers) => {
      const existingIndex = currentUsers.findIndex((user) => user.id === updatedUser.id);

      if (existingIndex === -1) {
        return [updatedUser, ...currentUsers];
      }

      const nextUsers = [...currentUsers];
      nextUsers[existingIndex] = updatedUser;
      return nextUsers;
    });
  }, []);

  const fetchAllUsers = useCallback(async (pagination?: PaginationParams) => {
    setIsUsersLoading(true);
    setUsersError(null);

    try {
      const authToken = getRequiredToken();
      const { data, total } = await apiFetchWithTotal<User[]>(
        withPagination("users", pagination),
        {},
        authToken,
      );
      setUsers(data);
      // Sans page/limit le backend renvoie tout : le total vaut alors la longueur
      // de la liste, et l'en-tete prend le relais des que l'on pagine.
      setUsersTotal(total ?? data.length);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      setUsersError(message);
      throw error;
    } finally {
      setIsUsersLoading(false);
    }
  }, [getRequiredToken]);

  const signup = useCallback(async (payload: SignupPayload) => {
    return apiFetch<SignupResponse>("users/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    return apiFetch<BackendMessage>("auth/resend-verification-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      const authToken = getRequiredToken();
      const createdUser = await apiFetch<User>(
        "users/create",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authToken,
      );

      upsertUser(createdUser);
      return createdUser;
    },
    [getRequiredToken, upsertUser],
  );

  const updateUserByAdmin = useCallback(
    async (id: string, payload: UpdateUserByAdminPayload) => {
      const authToken = getRequiredToken();
      const updatedUser = await apiFetch<User>(`users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, authToken);

      upsertUser(updatedUser);
      return updatedUser;
    },
    [getRequiredToken, upsertUser],
  );

  const updateMyProfile = useCallback(async (payload: UpdateMyProfilePayload) => {
    const authToken = getRequiredToken();

    return apiFetch<User>(
      "users/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      authToken,
    );
  }, [getRequiredToken]);

  const activateAccount = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const result = await apiFetch<BackendMessage>(
        `users/${id}/activate`,
        {
          method: "PATCH",
        },
        authToken,
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === id
            ? {
                ...user,
                isActive: true,
              }
            : user,
        ),
      );

      return result;
    },
    [getRequiredToken],
  );

  const deactivateAccount = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      // DELETE users/:id est une desactivation cote backend (soft delete avec
      // revocation des sessions), pas une suppression de ligne.
      const result = await apiFetch<BackendMessage>(
        `users/${id}`,
        {
          method: "DELETE",
        },
        authToken,
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === id
            ? {
                ...user,
                isActive: false,
              }
            : user,
        ),
      );

      return result;
    },
    [getRequiredToken],
  );

  const deactivateMyAccount = useCallback(async () => {
    const authToken = getRequiredToken();

    return apiFetch<BackendMessage>(
      "users/me",
      {
        method: "DELETE",
      },
      authToken,
    );
  }, [getRequiredToken]);

  const changeMyPassword = useCallback(async (payload: ChangePasswordPayload) => {
    const authToken = getRequiredToken();

    return apiFetch<BackendMessage>(
      "users/change-password",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      authToken,
    );
  }, [getRequiredToken]);

  const value = useMemo(
    () => ({
      users,
      usersTotal,
      isUsersLoading,
      usersError,
      clearUsersError,
      fetchAllUsers,
      signup,
      resendVerificationEmail,
      createUser,
      updateUserByAdmin,
      updateMyProfile,
      activateAccount,
      deactivateAccount,
      deactivateMyAccount,
      changeMyPassword,
    }),
    [
      users,
      usersTotal,
      isUsersLoading,
      usersError,
      clearUsersError,
      fetchAllUsers,
      signup,
      resendVerificationEmail,
      createUser,
      updateUserByAdmin,
      updateMyProfile,
      activateAccount,
      deactivateAccount,
      deactivateMyAccount,
      changeMyPassword,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUsers() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUsers must be used inside UserProvider");
  }

  return context;
}
