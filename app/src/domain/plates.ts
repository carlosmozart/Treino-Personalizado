// Calculadora de anilhas (M14): quanto pôr de cada lado da barra para chegar a uma carga.
import { normalizeExerciseName } from './text';

import type { Settings } from './model';

export const DEFAULT_BAR = 20;
export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5] as const;
export const DEFAULT_PLATES: readonly number[] = [25, 20, 15, 10, 5, 2.5, 1.25];

/** T7: atalhos para marcar as anilhas de uma vez. */
export const PLATE_PRESETS: readonly { label: string; plates: readonly number[] }[] = [
  { label: 'Academia comum', plates: DEFAULT_PLATES },
  { label: 'Com as pequenas', plates: [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1.25, 1, 0.5] },
  { label: 'Em casa', plates: [10, 5, 2.5, 2, 1] }
];

// ---------- T7: tipos de barra ----------

export type BarKind = 'olimpica' | 'feminina' | 'w' | 'hex';
/** `short`: no meio da frase ("barra W/EZ de 10 kg"). */
export const BAR_KINDS: readonly { id: BarKind; label: string; short: string; kg: number }[] = [
  { id: 'olimpica', label: 'Olímpica', short: 'olímpica', kg: 20 },
  { id: 'feminina', label: 'Feminina', short: 'feminina', kg: 15 },
  { id: 'w', label: 'W / EZ', short: 'W/EZ', kg: 10 },
  { id: 'hex', label: 'Hexagonal', short: 'hexagonal', kg: 25 }
];

type BarSettings = Pick<Settings, 'barWeight' | 'barWeights' | 'exerciseBars'>;

/** A barra pelo nome do exercício: "Rosca (Barra W)" usa a W; "Terra (Barra Hexagonal)", a hexagonal. */
export function guessBar(name: string): BarKind {
  const n = normalizeExerciseName(name);
  if (/hexagonal|trap bar/.test(n)) return 'hex';
  if (/\bbarra w\b|\bbarra ez\b|\brosca w\b|\btriceps w\b/.test(n)) return 'w';
  return 'olimpica';
}

/** A barra que o exercício usa: a escolhida na calculadora ou a do nome. */
export const barKindFor = (name: string, settings: BarSettings): BarKind =>
  settings.exerciseBars?.[normalizeExerciseName(name)] ?? guessBar(name);

/** Quanto pesa cada tipo de barra (a olímpica é o "Peso da barra" de sempre). */
export function barKg(kind: BarKind, settings: BarSettings): number {
  if (kind === 'olimpica') return settings.barWeight ?? DEFAULT_BAR;
  return settings.barWeights?.[kind] ?? BAR_KINDS.find(b => b.id === kind)!.kg;
}

/** Peso da barra de um exercício. */
export const barFor = (name: string, settings: BarSettings): number => barKg(barKindFor(name, settings), settings);

/** Muda a barra de um exercício (a do nome não fica guardada). */
export function setExerciseBar(settings: BarSettings, name: string, kind: BarKind): Pick<Settings, 'exerciseBars'> {
  const key = normalizeExerciseName(name);
  const { [key]: _old, ...rest } = settings.exerciseBars ?? {};
  return { exerciseBars: kind === guessBar(name) ? rest : { ...rest, [key]: kind } };
}

/** Muda o peso de um tipo de barra. */
export function setBarKg(settings: BarSettings, kind: BarKind, kg: number): Pick<Settings, 'barWeight' | 'barWeights'> {
  const value = Math.min(50, Math.max(0, Math.round(kg * 100) / 100));
  return kind === 'olimpica' ? { barWeight: value } : { barWeights: { ...(settings.barWeights ?? {}), [kind]: value } };
}

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
