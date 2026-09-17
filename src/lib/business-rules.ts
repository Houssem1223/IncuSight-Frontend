import { apiFetch } from "./api";

export type BusinessRules = {
  MAX_STARTUPS_PER_USER: number;
  MAX_EVALUATORS_PER_APPLICATION: number;
  DEFAULT_EVALUATION_DEADLINE_DAYS: number;
  MAX_ATTACHMENTS_PER_FOLLOWUP_UPDATE: number;
};

/**
 * Valeurs de repli, utilisees tant que l'appel reseau n'a pas repondu (ou s'il
 * echoue). Elles doivent rester alignees sur `BUSINESS_RULES` cote backend, mais
 * ne font plus autorite : le backend reste seul juge, ces bornes servent
 * uniquement a ne pas proposer une action vouee a etre refusee.
 */
export const BUSINESS_RULES_FALLBACK: BusinessRules = {
  MAX_STARTUPS_PER_USER: 5,
  MAX_EVALUATORS_PER_APPLICATION: 2,
  DEFAULT_EVALUATION_DEADLINE_DAYS: 7,
  MAX_ATTACHMENTS_PER_FOLLOWUP_UPDATE: 5,
};

export function getBusinessRules(): Promise<BusinessRules> {
  return apiFetch<BusinessRules>("business-rules");
}
