// Rotação de treinos A/B/C (R1, T14). Regras em docs/dev/rotacao.md.
import { DAY_KEYS, type DayKey } from './ai-plan';
import { addDays, type DateKey } from './dates';
import { DAY_FULL_NAMES, type Plan, type Workout } from './model';

const LETTERS = 'ABCDEFG';

const hasExercises = (plan: Plan, k: DayKey) => plan.days[k].exercises.length > 0;

/** T14: um lugar da volta é um treino (espaço do plano) ou um dia de descanso. */
export type RotationSlot = DayKey | 'rest';
export const REST_SLOT = 'rest';
/** Lugares na volta: os 7 treinos com folga para repetições e descansos. */
export const MAX_ROTATION_SLOTS = 14;

export const isWorkoutSlot = (s: RotationSlot): s is DayKey => s !== REST_SLOT;

/**
 * Volta efetiva (T14): a salva, com treinos repetidos e descansos, sem espaços vazios ou que
 * sumiram; no fim, os treinos com exercícios que não estão nela. Sem nenhum treino, vazia.
 */
export function rotationSlots(plan: Plan): RotationSlot[] {
  const saved = (plan.rotation?.order ?? []).filter(s => s === REST_SLOT || (DAY_KEYS.includes(s) && hasExercises(plan, s)));
  const all = [...saved, ...DAY_KEYS.filter(k => hasExercises(plan, k) && !saved.includes(k))];
  return all.some(isWorkoutSlot) ? all.slice(0, MAX_ROTATION_SLOTS) : [];
}

/** Treinos da rotação, cada um uma vez, na ordem em que aparecem na volta (dá a letra). */
export function rotationOrder(plan: Plan): DayKey[] {
  return [...new Set(rotationSlots(plan).filter(isWorkoutSlot))];
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
  /** Treinos distintos da volta (letras A, B, C…). */
  order: DayKey[];
  /** A volta inteira, com repetições e descansos. */
  slots: RotationSlot[];
  next: DayKey;
  /** Lugar do próximo treino na volta. */
  nextIndex: number;
  /** Treinos feitos na volta atual (0 = começando uma volta). */
  done: number;
  /** Treinos (sem os descansos) numa volta. */
  total: number;
  last: DayKey | null;
  /** Dias de descanso da volta entre o último treino e o próximo. */
  restDays: number;
  /** Último dia do descanso planejado depois do último treino (null sem descanso pela frente). */
  restUntil: DateKey | null;
  /** `today` cai no descanso planejado (só calculado quando `today` é informado). */
  restToday: boolean;
}

const startOf = (w: Workout) => w.startedAt ?? `${w.date}T00:00:00`;

/** Primeiro lugar com o treino `k` a partir de `from`, dando a volta. */
function slotOf(slots: readonly RotationSlot[], k: DayKey, from: number): number {
  for (let j = 0; j < slots.length; j++) {
    const i = (from + j) % slots.length;
    if (slots[i] === k) return i;
  }
  return -1;
}

/**
 * Próximo treino da rotação, pelo histórico deste plano. `null` sem rotação ou sem treinos.
 * T14: com treinos repetidos (A, B, C, B, D) o lugar na volta sai de percorrer os treinos em ordem:
 * cada um ocupa o primeiro lugar com o mesmo treino depois do anterior. O descanso depois do último
 * treino vale pelos dias de calendário seguintes; treinar nele passa direto para o próximo treino.
 */
export function rotationState(plan: Plan, workouts: readonly Workout[], today?: DateKey): RotationState | null {
  if (!plan.rotation) return null;
  const slots = rotationSlots(plan);
  if (!slots.length) return null;
  const order = [...new Set(slots.filter(isWorkoutSlot))];
  const restart = plan.rotation.restartAt;
  const counted = workouts
    .filter(w => w.planId === plan.id && !!w.dayKey && order.includes(w.dayKey) && !(restart && startOf(w) < restart))
    .sort((a, b) => (startOf(a) < startOf(b) ? -1 : startOf(a) > startOf(b) ? 1 : 0));
  let pos = -1;
  for (const w of counted) pos = slotOf(slots, w.dayKey!, pos + 1);
  const lastW = counted[counted.length - 1] ?? null;

  let nextIndex = (pos + 1) % slots.length;
  let restDays = 0;
  while (slots[nextIndex] === REST_SLOT) { restDays++; nextIndex = (nextIndex + 1) % slots.length; }
  // antes do primeiro treino, um descanso no começo da volta não segura ninguém
  if (!lastW) restDays = 0;
  const restUntil = lastW && restDays ? addDays(lastW.date, restDays) : null;
  return {
    order, slots, next: slots[nextIndex] as DayKey, nextIndex,
    done: slots.slice(0, nextIndex).filter(isWorkoutSlot).length,
    total: slots.filter(isWorkoutSlot).length,
    last: lastW?.dayKey ?? null,
    restDays, restUntil,
    restToday: !!(today && lastW && restUntil && today > lastW.date && today <= restUntil)
  };
}

/** Maior sequência de descansos seguidos na volta (contando a virada do fim para o começo). */
export function longestRestRun(plan: Plan): number {
  const slots = rotationSlots(plan);
  let best = 0, run = 0;
  for (const s of [...slots, ...slots]) { run = s === REST_SLOT ? run + 1 : 0; best = Math.max(best, run); }
  return Math.min(best, slots.length);
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

/** T14: move um lugar da volta (treino ou descanso) uma posição para cima (−1) ou para baixo (+1). */
export function moveSlot(plan: Plan, index: number, delta: -1 | 1): Plan {
  if (!plan.rotation) return plan;
  const slots = rotationSlots(plan);
  const j = index + delta;
  if (index < 0 || index >= slots.length || j < 0 || j >= slots.length) return plan;
  [slots[index], slots[j]] = [slots[j]!, slots[index]!];
  return { ...plan, rotation: { ...plan.rotation, order: slots } };
}

/** T14: põe um treino de novo ou um dia de descanso no fim da volta. */
export function addSlot(plan: Plan, slot: RotationSlot): Plan {
  if (!plan.rotation) return plan;
  const slots = rotationSlots(plan);
  if (!slots.length || slots.length >= MAX_ROTATION_SLOTS || (isWorkoutSlot(slot) && !hasExercises(plan, slot))) return plan;
  return { ...plan, rotation: { ...plan.rotation, order: [...slots, slot] } };
}

/** T14: um treino só sai da volta se aparecer outra vez nela (para tirar de vez, esvazie o treino). */
export function canRemoveSlot(plan: Plan, index: number): boolean {
  const slots = rotationSlots(plan);
  const s = slots[index];
  if (s === undefined) return false;
  return s === REST_SLOT || slots.filter(x => x === s).length > 1;
}

export function removeSlot(plan: Plan, index: number): Plan {
  if (!plan.rotation || !canRemoveSlot(plan, index)) return plan;
  return { ...plan, rotation: { ...plan.rotation, order: rotationSlots(plan).filter((_, i) => i !== index) } };
}

export function setRotationPerWeek(plan: Plan, perWeek: number): Plan {
  if (!plan.rotation) return plan;
  return { ...plan, rotation: { ...plan.rotation, perWeek: Math.min(7, Math.max(1, Math.round(perWeek))) } };
}

export function restartRotation(plan: Plan, now: Date): Plan {
  if (!plan.rotation) return plan;
  return { ...plan, rotation: { ...plan.rotation, restartAt: now.toISOString() } };
}

/** Folga máxima seguida que não quebra a sequência na rotação (T14: ou o maior descanso da volta). */
export function maxRestGap(perWeek: number, restRun = 0): number {
  const n = Math.min(7, Math.max(1, perWeek));
  return Math.max(1, Math.ceil((7 - n) / n), restRun);
}
