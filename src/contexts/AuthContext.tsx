"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { AuthResponse, LoginPayload } from "../types/auth";
import type { User } from "../types/user";
import { apiFetch } from "../lib/api";

type AuthContextType = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfileWithFallback(token: string): Promise<User> {
  const profileEndpoints = ["users/MyProfile", "users/my-profile", "users/me"];
  let lastError: unknown = null;

  for (const endpoint of profileEndpoints) {
    try {
      return await apiFetch<User>(endpoint, {}, token);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Unable to load user profile");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const clearAuthSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;

    const profile = await fetchProfileWithFallback(token);
    setUser(profile);
  }, [token]);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiFetch<AuthResponse>("auth/sign-in", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);

    setToken(data.token);
    setRefreshToken(data.refreshToken);

    const profile = await fetchProfileWithFallback(data.token);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiFetch(
          "auth/logout",
          {
            method: "POST",
          },
          token,
        );
      }
    } catch {
    } finally {
      clearAuthSession();
    }
  }, [token, clearAuthSession]);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (!storedToken) {
      setIsAuthReady(true);
      return;
    }

    setToken(storedToken);

    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProfile().catch(() => {
        clearAuthSession();
      }).finally(() => {
        setIsAuthReady(true);
      });
    }
  }, [token, loadProfile, clearAuthSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      isAuthenticated: !!token,
      isAuthReady,
      login,
      logout,
      loadProfile,
    }),
    [user, token, refreshToken, isAuthReady, login, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}