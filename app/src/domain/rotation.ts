// Rotação de treinos A/B/C (R1). Regras em docs/dev/rotacao.md.
import { DAY_KEYS, type DayKey } from './ai-plan';
import { DAY_FULL_NAMES, type Plan, type Workout } from './model';

const LETTERS = 'ABCDEFG';

const hasExercises = (plan: Plan, k: DayKey) => plan.days[k].exercises.length > 0;

/** Ordem efetiva: a salva (só espaços com exercícios) e, no fim, os que faltam nela. */
export function rotationOrder(plan: Plan): DayKey[] {
  const saved = (plan.rotation?.order ?? []).filter((k, i, all) => DAY_KEYS.includes(k) && all.indexOf(k) === i && hasExercises(plan, k));
  return [...saved, ...DAY_KEYS.filter(k => hasExercises(plan, k) && !saved.includes(k))];
}

/**
 * Nome do treino na rotação: sem o "Segunda:" que os modelos põem nem o "(opcional)";
 * sem nome, "Treino B".
 */
export function rotationTitle(plan: Plan, k: DayKey): string {
  const name = plan.days[k].name
    .replace(new RegExp(`^${DAY_FULL_NAMES[k]}:\\s*`, 'i'), '')
    .replace(/\s*\(opcional\)\s*$/i, '')
    .trim();
  return name || `Treino ${rotationLetter(plan, k)}`;
}

export function rotationLetter(plan: Plan, k: DayKey): string {
  const i = rotationOrder(plan).indexOf(k);
  return i >= 0 ? LETTERS[i]! : '';
}

export interface RotationState {
  order: DayKey[];
  next: DayKey;
  /** Treinos feitos na volta atual (0 = começando uma volta). */
  done: number;
  last: DayKey | null;
}

/** Próximo treino da rotação, pelo histórico deste plano. `null` sem rotação ou sem treinos. */
export function rotationState(plan: Plan, workouts: readonly Workout[]): RotationState | null {
  if (!plan.rotation) return null;
  const order = rotationOrder(plan);
  if (!order.length) return null;
  const restart = plan.rotation.restartAt;
  let last: Workout | null = null;
  for (const w of workouts) {
    if (w.planId !== plan.id || !w.dayKey || !order.includes(w.dayKey)) continue;
    const at = w.startedAt ?? `${w.date}T00:00:00`;
    if (restart && at < restart) continue;
    if (!last || at >= (last.startedAt ?? `${last.date}T00:00:00`)) last = w;
  }
  const lastKey = last?.dayKey ?? null;
  const next = lastKey ? order[(order.indexOf(lastKey) + 1) % order.length]! : order[0]!;
  return { order, next, done: order.indexOf(next), last: lastKey };
}

/**
 * Para usar um modelo em rotação: dias que repetem o treino de um dia anterior (A, B, A na semana)
 * saem, senão a volta teria o mesmo treino duas vezes seguidas (…A, A, B…).
 */
export function dedupeForRotation(plan: Plan): Plan {
  const seen = new Set<string>();
  const days = { ...plan.days };
  for (const k of DAY_KEYS) {
    const sig = days[k].exercises.map(e => e.name.trim().toLowerCase()).join('|');
    if (!sig) continue;
    if (seen.has(sig)) days[k] = { name: '', focus: '', optional: false, exercises: [] };
    else seen.add(sig);
  }
  return { ...plan, days };
}

/** Liga a rotação, começando pela ordem da semana e a meta igual ao número de treinos. */
export function enableRotation(plan: Plan): Plan {
  if (plan.rotation) return plan;
  const order = DAY_KEYS.filter(k => hasExercises(plan, k));
  return { ...plan, rotation: { order, perWeek: Math.min(7, Math.max(1, order.filter(k => !plan.days[k].optional).length || order.length)) } };
}

export function disableRotation(plan: Plan): Plan {
  if (!plan.rotation) return plan;
  const { rotation: _rotation, ...rest } = plan;
  return rest;
}

export function moveInRotation(plan: Plan, k: DayKey, delta: -1 | 1): Plan {
  if (!plan.rotation) return plan;
  const order = rotationOrder(plan);
  const i = order.indexOf(k), j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return plan;
  [order[i], order[j]] = [order[j]!, order[i]!];
  return { ...plan, rotation: { ...plan.rotation, order } };
}

export function setRotationPerWeek(plan: Plan, perWeek: number): Plan {
  if (!plan.rotation) return plan;
  return { ...plan, rotation: { ...plan.rotation, perWeek: Math.min(7, Math.max(1, Math.round(perWeek))) } };
}

export function restartRotation(plan: Plan, now: Date): Plan {
  if (!plan.rotation) return plan;
  return { ...plan, rotation: { ...plan.rotation, restartAt: now.toISOString() } };
}

/** Folga máxima seguida que não quebra a sequência na rotação. */
export function maxRestGap(perWeek: number): number {
  const n = Math.min(7, Math.max(1, perWeek));
  return Math.max(1, Math.ceil((7 - n) / n));
}
