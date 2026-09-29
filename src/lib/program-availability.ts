import type { Program } from "../types/program";

export function isProgramOpen(program: Program, now = Date.now()): boolean {
  const start = Date.parse(program.openDate);
  const end = Date.parse(program.closeDate);
  return program.isOpen === true && Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end;
}
