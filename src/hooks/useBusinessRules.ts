"use client";

import { useEffect, useState } from "react";
import {
  BUSINESS_RULES_FALLBACK,
  getBusinessRules,
  type BusinessRules,
} from "@/src/lib/business-rules";

/**
 * Limites metier servies par le backend (`GET /business-rules`).
 *
 * Elles etaient recopiees en dur des deux cotes (5 profils startup, 2 evaluateurs,
 * 5 pieces jointes) : rien n'empechait les copies de diverger, et l'UI aurait
 * alors propose une action que le backend refuse.
 *
 * Le repli local evite un ecran vide pendant le chargement ; le backend reste la
 * seule autorite, ces bornes ne servent qu'a l'affichage et a la desactivation
 * anticipee des actions.
 */
export function useBusinessRules(): BusinessRules {
  const [rules, setRules] = useState<BusinessRules>(BUSINESS_RULES_FALLBACK);

  useEffect(() => {
    let isActive = true;

    getBusinessRules()
      .then((fetched) => {
        if (isActive) {
          setRules(fetched);
        }
      })
      .catch(() => {
        // Le repli reste en place : une limite d'affichage legerement perimee ne
        // justifie pas un etat d'erreur visible.
      });

    return () => {
      isActive = false;
    };
  }, []);

  return rules;
}
