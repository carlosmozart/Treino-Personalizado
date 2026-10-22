// M19: remarcar o treino de um dia para outro sem mudar o plano semanal. Vale só para a semana
// fixa (na rotação o próximo treino já espera a pessoa). A remarcação fica gravada por data: na
// origem o dia vira descanso (`day: null`, com `to`), no destino entra o dia do plano (com `from`).
// Remarcar de novo um treino já remarcado não encadeia: a origem passa a apontar para o novo dia.
import { addDays, fromDateKey, toDateKey, type DateKey } from './dates';
import type { DayKey } from './ai-plan';
import { dayKeyOf, type AppData, type DayMove, type Plan } from './model';
import { key, tombstone, touch } from './sync';
import type { ActionResult } from './actions';

/** Até quantos dias depois do treino dá para remarcar. */
export const MOVE_DAYS = 6;

type Moves = Readonly<Record<DateKey, DayMove>>;

/** A remarcação da data no plano, se houver (de outro plano não conta). */
export function moveOn(plan: Plan, date: DateKey, moves: Moves = {}): DayMove | null {
  const move = moves[date];
  return move && move.planId === plan.id ? move : null;
}

/** Dia do plano com treino na data, já com as remarcações. Null: descanso. */
export function scheduledDay(plan: Plan, date: DateKey, moves: Moves = {}): DayKey | null {
  const move = moveOn(plan, date, moves);
  if (move) return move.day;
  const k = dayKeyOf(fromDateKey(date));
  return plan.days[k].exercises.length ? k : null;
}

export type MoveTarget = { date: DateKey; free: true } | { date: DateKey; free: false; why: 'treino' | 'nota' };

/** Os dias seguintes para onde o treino pode ir: livres são os sem treino e sem nota. */
export function moveTargets(data: AppData, plan: Plan, from: DateKey): MoveTarget[] {
  return Array.from({ length: MOVE_DAYS }, (_, i) => {
    const date = addDays(from, i + 1);
    if (scheduledDay(plan, date, data.moves) || data.checkins[date]) return { date, free: false, why: 'treino' };
    if (data.dayNotes?.[date]) return { date, free: false, why: 'nota' };
    return { date, free: true };
  });
}

/** O treino da data pode ser remarcado: semana fixa, hoje ou depois, com treino e ainda não feito. */
export function canMove(data: AppData, plan: Plan, date: DateKey, now: Date): boolean {
  return !plan.rotation && date >= toDateKey(now) && !data.checkins[date] && !!scheduledDay(plan, date, data.moves);
}

const draftOf = (data: AppData): AppData => ({
  ...data, moves: { ...(data.moves ?? {}) }, sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } }
});

/** Leva o treino de `from` para `to` (um dia livre até MOVE_DAYS depois) no plano ativo. */
export function moveWorkout(data: AppData, from: DateKey, to: DateKey, now: Date): ActionResult {
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;
  const unchanged = { data, events: [] };
  if (!plan || !canMove(data, plan, from, now)) return unchanged;
  if (!moveTargets(data, plan, from).some(t => t.free && t.date === to)) return unchanged;
  const day = scheduledDay(plan, from, data.moves)!;
  const draft = draftOf(data);
  const moves = draft.moves!;
  const origin = moveOn(plan, from, data.moves)?.from ?? from;
  if (origin !== from) {
    // já era remarcado: o dia intermediário volta a ser o que era (descanso) e a origem aponta para o novo
    delete moves[from];
    tombstone(draft, key.move(from), now);
  }
  moves[origin] = { planId: plan.id, day: null, to };
  moves[to] = { planId: plan.id, day, from: origin };
  touch(draft, key.move(origin), now);
  touch(draft, key.move(to), now);
  return { data: draft, events: [] };
}

/**
 * Desfaz a remarcação que passa pela data (origem ou destino): o treino volta para a origem. Só
 * enquanto a origem é hoje ou depois (não devolve treino para um dia que já passou) e o treino
 * ainda não foi feito.
 */
export function undoMove(data: AppData, date: DateKey, now: Date): ActionResult {
  const move = data.moves?.[date];
  const pair = move?.from ? [move.from, date] : move?.to ? [date, move.to] : null;
  if (!pair || pair[0]! < toDateKey(now) || data.checkins[pair[1]!]) return { data, events: [] };
  const draft = draftOf(data);
  for (const d of pair) {
    delete draft.moves![d];
    tombstone(draft, key.move(d), now);
  }
  return { data: draft, events: [] };
}
