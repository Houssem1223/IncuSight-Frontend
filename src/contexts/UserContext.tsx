"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/contexts/AuthContext";
import type { UserRole } from "@/src/types/auth";
import type { User } from "@/src/types/user";

type SignUpPayload = {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
};

type CreateUserPayload = SignUpPayload & {
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
  isUsersLoading: boolean;
  usersError: string | null;
  clearUsersError: () => void;
  fetchAllUsers: () => Promise<User[]>;
  findOneUser: (id: string) => Promise<User>;
  fetchMyProfile: () => Promise<User>;
  signup: (payload: SignUpPayload) => Promise<User>;
  createUser: (payload: CreateUserPayload) => Promise<User>;
  updateUserByAdmin: (id: string, payload: UpdateUserByAdminPayload) => Promise<User>;
  updateMyProfile: (payload: UpdateMyProfilePayload) => Promise<User>;
  activateAccount: (id: string) => Promise<BackendMessage>;
  deactivateAccount: (id: string) => Promise<BackendMessage>;
  deactivateMyAccount: () => Promise<BackendMessage>;
  changeMyPassword: (payload: ChangePasswordPayload) => Promise<BackendMessage>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

async function apiFetchWithFallback<T>(
  endpoints: readonly string[],
  options: RequestInit,
  token?: string,
 ): Promise<T> {
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      return await apiFetch<T>(endpoint, options, token);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Request failed");
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
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

  const fetchAllUsers = useCallback(async () => {
    setIsUsersLoading(true);
    setUsersError(null);

    try {
      const authToken = getRequiredToken();
      const data = await apiFetchWithFallback<User[]>(
        ["users/listeDesUtilisateurs", "users"],
        {},
        authToken,
      );
      setUsers(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      setUsersError(message);
      throw error;
    } finally {
      setIsUsersLoading(false);
    }
  }, [getRequiredToken]);

  const findOneUser = useCallback(
    async (id: string) => {
      const authToken = getRequiredToken();
      const user = await apiFetch<User>(`users/${id}`, {}, authToken);
      upsertUser(user);
      return user;
    },
    [getRequiredToken, upsertUser],
  );

  const fetchMyProfile = useCallback(async () => {
    const authToken = getRequiredToken();

    return apiFetchWithFallback<User>(
      ["users/MyProfile", "users/my-profile", "users/me"],
      {},
      authToken,
    );
  }, [getRequiredToken]);

  const signup = useCallback(async (payload: SignUpPayload) => {
    return apiFetchWithFallback<User>(
      ["users/signup", "users/Signup"],
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      undefined,
    );
  }, []);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      const authToken = getRequiredToken();
      const createdUser = await apiFetchWithFallback<User>(
        ["users/create", "users"],
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

    return apiFetchWithFallback<User>(
      ["users/UpdateMyProfile", "users/MyProfile", "users/my-profile", "users/me"],
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
      const result = await apiFetchWithFallback<BackendMessage>(
        [`users/activate/${id}`, `users/${id}/activate`],
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
      let result: BackendMessage;

      try {
        result = await apiFetch<BackendMessage>(`users/${id}`, {
          method: "DELETE",
        }, authToken);
      } catch {
        result = await apiFetchWithFallback<BackendMessage>(
          [`users/${id}/desactivate`, `users/${id}/deactivate`],
          {
            method: "PATCH",
          },
          authToken,
        );
      }

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

    return apiFetchWithFallback<BackendMessage>(
      ["users/DesactivateMyAccount", "users/desactivate-my-account"],
      {
        method: "DELETE",
      },
      authToken,
    );
  }, [getRequiredToken]);

  const changeMyPassword = useCallback(async (payload: ChangePasswordPayload) => {
    const authToken = getRequiredToken();

    return apiFetchWithFallback<BackendMessage>(
      [
        "users/Change%20My%20Password",
        "users/Change My Password",
        "users/ChangeMyPass",
        "users/change-my-password",
        "users/change-password",
      ],
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
      isUsersLoading,
      usersError,
      clearUsersError,
      fetchAllUsers,
      findOneUser,
      fetchMyProfile,
      signup,
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
      isUsersLoading,
      usersError,
      clearUsersError,
      fetchAllUsers,
      findOneUser,
      fetchMyProfile,
      signup,
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