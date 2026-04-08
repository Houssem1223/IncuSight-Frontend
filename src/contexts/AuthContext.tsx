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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!token) return;

    const profile = await apiFetch<User>("users/MyProfile", {}, token);
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

    const profile = await apiFetch<User>("users/MyProfile", {}, data.token);
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
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, [token]);

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
        setUser(null);
      }).finally(() => {
        setIsAuthReady(true);
      });
    }
  }, [token, loadProfile]);

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