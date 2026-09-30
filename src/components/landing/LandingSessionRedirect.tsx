"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { getDashboardRoute } from "@/src/lib/routeDashboard";

// Comportement conserve de l'ancienne landing : la carte de connexion, montee
// en permanence dans le hero, envoyait un utilisateur deja connecte vers son
// dashboard. Elle ne s'affiche plus que sur ?auth=, d'ou ce composant.
export default function LandingSessionRedirect() {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthReady && isAuthenticated && user?.role) {
      router.push(getDashboardRoute(user.role));
    }
  }, [isAuthReady, isAuthenticated, user, router]);

  return null;
}
