// Calculadora de anilhas (M14): quanto pôr de cada lado da barra para chegar a uma carga.
import { normalizeExerciseName } from './text';

export const DEFAULT_BAR = 20;
export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5] as const;
export const DEFAULT_PLATES: readonly number[] = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Exercício com barra livre, pelo nome ("Barra Fixa" é a de pendurar, não conta). */
export function isBarbell(name: string): boolean {
  const n = normalizeExerciseName(name);
  if (n.includes('barra fixa')) return false;
  return /\bbarra\b|agachamento livre|levantamento terra|smith/.test(n);
}

export type PlateLoad =
  | { kind: 'empty' }
  | { kind: 'below-bar' }
  | { kind: 'plates'; perSide: number[]; /** O que faltou por lado, sem anilha que dê. */ missing: number };

/** Anilhas por lado, das mais pesadas para as mais leves (cada lado recebe o mesmo). */
export function plateLoad(total: number, bar: number, plates: readonly number[]): PlateLoad {
  const eps = 1e-6;
  if (total < bar - eps) return { kind: 'below-bar' };
  let side = (total - bar) / 2;
  if (side < eps) return { kind: 'empty' };
  const perSide: number[] = [];
  for (const p of [...plates].filter(p => p > 0).sort((a, b) => b - a)) {
    while (side >= p - eps) { perSide.push(p); side -= p; }
  }
  return { kind: 'plates', perSide, missing: Math.round(side * 100) / 100 };
}
