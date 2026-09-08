import type { Program } from "@/src/types/program";

export type ProgramFormState = {
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isOpen: boolean;
};

export type ProgramEditFormState = ProgramFormState & {
  id: string;
};

export type ProgramPayload = {
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isOpen: boolean;
};

export const emptyProgramForm: ProgramFormState = {
  title: "",
  description: "",
  openDate: "",
  closeDate: "",
  isOpen: false,
};

export function toDateTimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function toIsoDate(localDate: string): string {
  return new Date(localDate).toISOString();
}

export function formatProgramDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

export function mapProgramToForm(program: Program): ProgramEditFormState {
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    openDate: toDateTimeLocalValue(program.openDate),
    closeDate: toDateTimeLocalValue(program.closeDate),
    isOpen: program.isOpen,
  };
}

export function buildProgramPayload(form: ProgramFormState): ProgramPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    openDate: toIsoDate(form.openDate),
    closeDate: toIsoDate(form.closeDate),
    isOpen: form.isOpen,
  };
}

export function getProgramFormValidationError(form: ProgramFormState): string | null {
  if (!form.title.trim()) {
    return "Program title is required.";
  }

  if (!form.description.trim()) {
    return "Program description is required.";
  }

  if (!form.openDate || !form.closeDate) {
    return "Open and close dates are required.";
  }

  if (new Date(form.closeDate).getTime() <= new Date(form.openDate).getTime()) {
    return "Close date must be after open date.";
  }

  return null;
}
