"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createDashboardQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Legerement sous le TTL de 45s du cache serveur : on evite de servir une
        // donnee que TanStack croit fraiche alors que le serveur l'a recalculee,
        // sans refetcher a chaque rendu.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Monte le client TanStack Query pour tout le dashboard.
 *
 * Il ne vivait auparavant que dans le layout admin : toute page evaluateur ou
 * startup appelant useQuery aurait leve « No QueryClient set » a l'execution —
 * une erreur que le typage ne peut pas attraper.
 */
export default function DashboardQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createDashboardQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
