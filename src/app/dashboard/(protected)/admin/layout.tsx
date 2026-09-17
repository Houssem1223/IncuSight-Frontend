"use client";

import { useCallback, type ReactNode } from "react";
import { useApplications } from "@/src/contexts/ApplicationContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAutoRefresh } from "@/src/hooks/useAutoRefresh";
import { usePrograms } from "@/src/contexts/ProgramContext";
import { useStartups } from "@/src/contexts/StartupContext";

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

// Le QueryClientProvider est remonte au layout protege (DashboardProviders) :
// il est desormais partage par les trois roles, pas seulement par l'admin.
export default function AdminLayout({ children }: { children: ReactNode }) {
  useSidebarCountsBootstrap();

  return <>{children}</>;
}
