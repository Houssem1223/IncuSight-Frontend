"use client";

import { useCallback, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useStartups } from "@/src/contexts/StartupContext";

function createDashboardQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// 5 min : ces listes changent rarement d'une minute a l'autre, contrairement
// aux notifications (deja rafraichies toutes les 30s par NotificationContext).
const SIDEBAR_COUNTS_REFRESH_MS = 5 * 60 * 1000;

/**
 * Alimente les compteurs de la sidebar (Startups/Programs/Applications) via
 * les memes contextes que les pages de gestion admin (AdminStartupsList,
 * AdminProgramsManagement, ...) : un seul point de refresh partage plutot
 * qu'un fetch dedie a la sidebar. Les erreurs sont avalees en silence — un
 * badge absent ou legerement perime n'a pas besoin d'etat d'erreur visible,
 * chaque page de gestion affiche deja sa propre erreur si l'utilisateur y va.
 */
function useSidebarCountsBootstrap() {
  const { token } = useAuth();
  const { fetchAllStartups } = useStartups();
  const { fetchAllPrograms } = usePrograms();
  const { fetchAllApplications } = useApplications();

  const refresh = useCallback(() => {
    void fetchAllStartups().catch(() => {});
    void fetchAllPrograms().catch(() => {});
    void fetchAllApplications().catch(() => {});
  }, [fetchAllApplications, fetchAllPrograms, fetchAllStartups]);

  useAutoRefresh(refresh, {
    enabled: Boolean(token),
    intervalMs: SIDEBAR_COUNTS_REFRESH_MS,
    refreshOnFocus: true,
  });
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createDashboardQueryClient);
  useSidebarCountsBootstrap();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
