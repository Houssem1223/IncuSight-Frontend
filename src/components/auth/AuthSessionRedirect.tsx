"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { getSessionRedirectDecision } from "@/src/lib/auth-routing";

export default function AuthSessionRedirect() {
  const { sessionExpired } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    const decision = getSessionRedirectDecision(
      sessionExpired,
      hasRedirected.current,
    );

    hasRedirected.current = decision.hasRedirected;

    if (decision.target) {
      router.replace(decision.target);
    }
  }, [router, sessionExpired]);

  return null;
}
