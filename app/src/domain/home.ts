// O que a tela de Início mostra, calculado a partir dos dados (nada gravado).
import { DAY_KEYS, type DayKey } from './ai-plan';
import { addDays, mondayOf, toDateKey, type DateKey } from './dates';
import { goalProgress } from './body-goal';
import { levelInfo, freeMealThreshold, type LevelInfo } from './gamification';
import { DAY_FULL_NAMES, type AppData, type DayNote } from './model';
import { moveOn, scheduledDay } from './reschedule';
import { rotationLetter, rotationState, rotationTitle } from './rotation';
import { daysPerWeekOf, streakOf, weekCheckins } from './rewards';
import { waterTargetMl } from './health';

const SHORT: Record<DayKey, string> = { SEG: 'S', TER: 'T', QUA: 'Q', QUI: 'Q', SEX: 'S', SAB: 'S', DOM: 'D' };

export interface WeekDay {
  date: DateKey;
  dayKey: DayKey;
  /** Letra do dia (S, T, Q...). */
  letter: string;
  dayOfMonth: number;
  trained: boolean;
  today: boolean;
  future: boolean;
  /** Dia com treino obrigatório no plano ativo. */
  planned: boolean;
  /** S8: motivo anotado para o dia sem treino. */
  note: DayNote | null;
  /** M19: o treino saiu deste dia ('out') ou veio de outro ('in'). */
  moved: 'out' | 'in' | null;
}

function activePlan(data: AppData) {
  return data.activePlanId ? data.plans[data.activePlanId] : undefined;
}

/** Semana de segunda a domingo da data atual (N6). */
export function weekStrip(data: AppData, now: Date): WeekDay[] {
  const today = toDateKey(now);
  const monday = mondayOf(today);
  const plan = activePlan(data);
  return DAY_KEYS.map((dayKey, i) => {
    const date = addDays(monday, i);
    const fixed = plan && !plan.rotation ? plan : undefined;
    const sched = fixed ? scheduledDay(fixed, date, data.moves) : null;
    const move = fixed ? moveOn(fixed, date, data.moves) : null;
    return {
      date, dayKey, letter: SHORT[dayKey], dayOfMonth: Number(date.slice(8, 10)),
      trained: !!data.checkins[date], today: date === today, future: date > today,
      planned: !!sched && !fixed!.days[sched].optional,
      note: data.dayNotes?.[date] ?? null,
      moved: move ? (move.day ? 'in' : 'out') : null
    };
  });
}

export type TodayCard =
  | { kind: 'no-plan' }
  | { kind: 'in-progress'; title: string; setsDone: number; setsTotal: number }
  | { kind: 'workout'; dayKey: DayKey; title: string; focus: string; exercises: number; optional: boolean; doneToday: boolean;
      /** Rotação (R1): letra, treinos feitos na volta e tamanho da volta. */
      rotation?: { letter: string; done: number; total: number };
      /** M19: treino remarcado para hoje, vindo desta data. */
      movedFrom?: DateKey }
  /** M35: no descanso, quando é o próximo treino. M19: `movedTo` quando o treino de hoje foi remarcado. */
  | { kind: 'rest'; next: { dayKey: DayKey; title: string; inDays: number } | null; movedTo?: DateKey };

export function todayCard(data: AppData, now: Date, session: { dayName: string; exercises: { sets: { done: boolean }[] }[] } | null): TodayCard {
  if (session) {
    const sets = session.exercises.flatMap(e => e.sets);
    return { kind: 'in-progress', title: session.dayName, setsDone: sets.filter(s => s.done).length, setsTotal: sets.length };
  }
  const plan = activePlan(data);
  if (!plan) return { kind: 'no-plan' };
  const rot = rotationState(plan, data.workouts);
  if (rot) {
    const day = plan.days[rot.next];
    return {
      kind: 'workout', dayKey: rot.next, title: rotationTitle(plan, rot.next), focus: day.focus,
      exercises: day.exercises.length, optional: false, doneToday: !!data.checkins[toDateKey(now)],
      rotation: { letter: rotationLetter(plan, rot.next), done: rot.done, total: rot.order.length }
    };
  }
  const today = toDateKey(now);
  const move = moveOn(plan, today, data.moves);
  const dayKey = scheduledDay(plan, today, data.moves);
  if (dayKey) {
    const day = plan.days[dayKey];
    return {
      kind: 'workout', dayKey, title: day.name.replace(/\s*\(opcional\)\s*$/i, '') || dayKey, focus: day.focus,
      exercises: day.exercises.length, optional: day.optional, doneToday: !!data.checkins[today],
      ...(move?.from ? { movedFrom: move.from } : {})
    };
  }
  const movedTo = move?.to ? { movedTo: move.to } : {};
  for (let inDays = 1; inDays <= 7; inDays++) {
    const k = scheduledDay(plan, addDays(today, inDays), data.moves);
    if (k) return { kind: 'rest', next: { dayKey: k, title: plan.days[k].name.replace(/\s*\(opcional\)\s*$/i, '') || k, inDays }, ...movedTo };
  }
  return { kind: 'rest', next: null, ...movedTo };
}

export interface ProgressCard {
  streak: number;
  longestStreak: number;
  weekDone: number;
  weekTarget: number;
  /** Treinos que faltam na semana para liberar a refeição livre (0 = liberada). */
  freeMealMissing: number;
  freeMealUnlocked: boolean;
  totalWorkouts: number;
  level: LevelInfo;
}

/** Sequência, semana e nível (N8). */
export function progressCard(data: AppData, now: Date): ProgressCard {
  const today = toDateKey(now);
  const weekDone = weekCheckins(data, today);
  const target = daysPerWeekOf(data);
  const streak = streakOf(data, now);
  return {
    streak,
    longestStreak: Math.max(streak, data.gamification.longestStreak),
    weekDone,
    weekTarget: target,
    freeMealMissing: Math.max(0, freeMealThreshold(target) - weekDone),
    freeMealUnlocked: !!data.gamification.freeMealRewards[mondayOf(today)],
    totalWorkouts: data.workouts.length,
    level: levelInfo(data.gamification.totalXP)
  };
}

export interface WeightCard {
  current: number;
  date: DateKey;
  /** Variação desde a pesagem anterior. */
  delta: number | null;
  target: number | null;
  remaining: number | null;
  /** Progresso da meta em %, quando há meta com ponto de partida. */
  goalPercent: number | null;
  /** Indo na direção da meta (O6/M39: verde quando aproxima). */
  towardGoal: boolean | null;
  /** Últimas pesagens para o gráfico. */
  points: { date: DateKey; weight: number }[];
}

/** Peso (N7). Null sem nenhuma pesagem nem peso no cadastro. */
export function weightCard(data: AppData, maxPoints = 12): WeightCard | null {
  const p = data.profile;
  const weighIns = p.weighIns;
  const last = weighIns[weighIns.length - 1];
  const current = last?.weight ?? p.weightKg;
  if (!current) return null;
  const prev = weighIns.length > 1 ? weighIns[weighIns.length - 2]!.weight : null;
  const delta = prev === null ? null : Math.round((current - prev) * 10) / 10;
  const target = p.weightGoal?.targetWeight ?? p.targetWeightKg;
  const progress = p.weightGoal ? goalProgress(p.weightGoal.startWeight, current, p.weightGoal.targetWeight) : null;
  return {
    current,
    date: last?.date ?? '',
    delta,
    target: target ?? null,
    remaining: target ? Math.round(Math.abs(target - current) * 10) / 10 : null,
    goalPercent: progress ? Math.round(progress.percent) : null,
    towardGoal: target && delta !== null && delta !== 0 ? Math.abs(current - target) < Math.abs(current - delta - target) : null,
    points: weighIns.slice(-maxPoints)
  };
}

export interface WaterCard { ml: number; target: number; percent: number }

export function waterCard(data: AppData, now: Date): WaterCard | null {
  const target = waterTargetMl(data.profile.weightKg ?? 0, data.profile.activityLevel);
  if (!target) return null;
  const ml = data.water[toDateKey(now)] ?? 0;
  return { ml, target, percent: Math.min(100, Math.round((ml / target) * 100)) };
}

/**
 * S4: o próximo treino depois do de hoje. Na rotação, o próximo da volta; na semana fixa, o
 * próximo dia com treino a partir de amanhã.
 */
export function nextWorkoutAfterToday(data: AppData, now: Date): { title: string; when: string } | null {
  const plan = activePlan(data);
  if (!plan) return null;
  const rot = rotationState(plan, data.workouts);
  if (rot) return { title: rotationTitle(plan, rot.next), when: `treino ${rotationLetter(plan, rot.next)} da rotação` };
  for (let inDays = 1; inDays <= 7; inDays++) {
    const k = scheduledDay(plan, addDays(toDateKey(now), inDays), data.moves);
    if (k) return { title: plan.days[k].name.replace(/\s*\(opcional\)\s*$/i, '') || DAY_FULL_NAMES[k], when: inDays === 1 ? 'amanhã' : `em ${inDays} dias` };
  }
  return null;
}

export interface WeekWeight { monday: DateKey; average: number; count: number; change: number | null }

/** M38: pesagens agrupadas por semana (de segunda), com a média e a variação da média anterior. */
export function weeklyWeights(weighIns: readonly { date: DateKey; weight: number }[]): WeekWeight[] {
  const byWeek = new Map<DateKey, number[]>();
  for (const w of weighIns) {
    const k = mondayOf(w.date);
    byWeek.set(k, [...(byWeek.get(k) ?? []), w.weight]);
  }
  const weeks = [...byWeek].sort(([a], [b]) => a.localeCompare(b)).map(([monday, ws]) => ({
    monday, count: ws.length, average: Math.round((ws.reduce((t, x) => t + x, 0) / ws.length) * 10) / 10
  }));
  return weeks.map((w, i) => ({ ...w, change: i ? Math.round((w.average - weeks[i - 1]!.average) * 10) / 10 : null }));
}
