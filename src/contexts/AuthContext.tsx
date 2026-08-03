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
import {
  ApiError,
  apiFetch,
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_UPDATED_EVENT,
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type SessionClearedEventDetail,
} from "../lib/api";

type AuthContextType = {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  sessionExpired: boolean;
  profileError: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_LOAD_ERROR =
  "Impossible de charger votre profil pour le moment. Vérifiez votre connexion puis réessayez.";

type TokenUpdatedEventDetail = {
  token: string;
  refreshToken?: string;
};

async function fetchProfileWithFallback(token: string): Promise<User> {
  const profileEndpoints = ["users/MyProfile", "users/my-profile", "users/me"];
  let lastError: unknown = null;

  for (const endpoint of profileEndpoints) {
    try {
      return await apiFetch<User>(endpoint, {}, token);
    } catch (error) {
      lastError = error;

      if (!(error instanceof ApiError) || error.status !== 404) {
        throw error;
      }
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
  const [sessionExpired, setSessionExpired] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setProfileError(null);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;

    try {
      const profile = await fetchProfileWithFallback(token);
      setProfileError(null);
      setUser(profile);
    } catch (error) {
      if (getAccessToken() && !(error instanceof ApiError && error.status === 409)) {
        setProfileError(PROFILE_LOAD_ERROR);
      }

      throw error;
    }
  }, [token]);

  const login = useCallback(async (payload: LoginPayload) => {
    setProfileError(null);
    const data = await apiFetch<AuthResponse>("auth/sign-in", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    saveSession(data.token, data.refreshToken);

    setToken(data.token);
    setRefreshToken(data.refreshToken);
    setSessionExpired(false);

    try {
      const profile = await fetchProfileWithFallback(data.token);
      setUser(profile);
    } catch (error) {
      if (getAccessToken() && !(error instanceof ApiError && error.status === 409)) {
        setProfileError(PROFILE_LOAD_ERROR);
      }

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const storedRefreshToken = getRefreshToken();

    try {
      if (token && storedRefreshToken) {
        await apiFetch(
          "auth/logout",
          {
            method: "POST",
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          },
          token,
        );
      }
    } catch {
    } finally {
      clearSession("logout");
      clearAuthState();
      setSessionExpired(false);
      setProfileError(null);
    }
  }, [token, clearAuthState]);

  useEffect(() => {
    const storedToken = getAccessToken();
    const storedRefreshToken = getRefreshToken();

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
    const handleTokenUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<TokenUpdatedEventDetail>;
      const updatedToken = customEvent.detail?.token;
      const updatedRefreshToken = customEvent.detail?.refreshToken;

      if (typeof updatedToken === "string" && updatedToken) {
        setToken(updatedToken);
      }

      if (typeof updatedRefreshToken === "string" && updatedRefreshToken) {
        setRefreshToken(updatedRefreshToken);
      }

      setSessionExpired(false);
      setProfileError(null);
    };

    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent<SessionClearedEventDetail>;

      clearAuthState();
      setIsAuthReady(true);
      setSessionExpired(customEvent.detail?.reason === "expired");
    };

    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated as EventListener);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated as EventListener);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (!token) {
      setIsAuthReady(true);
      return;
    }

    loadProfile()
      .catch(() => {
        // apiFetch centralise le nettoyage des erreurs d'authentification.
        // Une panne réseau ou serveur ne doit pas détruire une session valide.
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, [token, loadProfile, clearAuthState]);

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      isAuthenticated: !!token,
      isAuthReady,
      sessionExpired,
      profileError,
      login,
      logout,
      loadProfile,
    }),
    [
      user,
      token,
      refreshToken,
      isAuthReady,
      sessionExpired,
      profileError,
      login,
      logout,
      loadProfile,
    ],
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
