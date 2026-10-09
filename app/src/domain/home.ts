// O que a tela de Início mostra, calculado a partir dos dados (nada gravado).
import { DAY_KEYS, type DayKey } from './ai-plan';
import { addDays, mondayOf, toDateKey, type DateKey } from './dates';
import { goalProgress } from './body-goal';
import { levelInfo, freeMealThreshold, type LevelInfo } from './gamification';
import { DAY_FULL_NAMES, dayKeyOf, type AppData, type DayNote, type PlanDay } from './model';
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
}

function activePlan(data: AppData) {
  return data.activePlanId ? data.plans[data.activePlanId] : undefined;
}

const isTrainingDay = (day: PlanDay | undefined) => !!day && day.exercises.length > 0;

/** Semana de segunda a domingo da data atual (N6). */
export function weekStrip(data: AppData, now: Date): WeekDay[] {
  const today = toDateKey(now);
  const monday = mondayOf(today);
  const plan = activePlan(data);
  return DAY_KEYS.map((dayKey, i) => {
    const date = addDays(monday, i);
    const day = plan?.days[dayKey];
    return {
      date, dayKey, letter: SHORT[dayKey], dayOfMonth: Number(date.slice(8, 10)),
      trained: !!data.checkins[date], today: date === today, future: date > today,
      planned: !plan?.rotation && isTrainingDay(day) && !day!.optional,
      note: data.dayNotes?.[date] ?? null
    };
  });
}

export type TodayCard =
  | { kind: 'no-plan' }
  | { kind: 'in-progress'; title: string; setsDone: number; setsTotal: number }
  | { kind: 'workout'; dayKey: DayKey; title: string; focus: string; exercises: number; optional: boolean; doneToday: boolean;
      /** Rotação (R1): letra, treinos feitos na volta e tamanho da volta. */
      rotation?: { letter: string; done: number; total: number } }
  /** M35: no descanso, quando é o próximo treino. */
  | { kind: 'rest'; next: { dayKey: DayKey; title: string; inDays: number } | null };

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
  const dayKey = dayKeyOf(now);
  const day = plan.days[dayKey];
  if (isTrainingDay(day)) {
    return {
      kind: 'workout', dayKey, title: day.name.replace(/\s*\(opcional\)\s*$/i, '') || dayKey, focus: day.focus,
      exercises: day.exercises.length, optional: day.optional, doneToday: !!data.checkins[toDateKey(now)]
    };
  }
  for (let inDays = 1; inDays <= 7; inDays++) {
    const date = new Date(now);
    date.setDate(date.getDate() + inDays);
    const k = dayKeyOf(date);
    const next = plan.days[k];
    if (isTrainingDay(next)) return { kind: 'rest', next: { dayKey: k, title: next.name.replace(/\s*\(opcional\)\s*$/i, '') || k, inDays } };
  }
  return { kind: 'rest', next: null };
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
    const date = new Date(now);
    date.setDate(date.getDate() + inDays);
    const day = plan.days[dayKeyOf(date)];
    if (isTrainingDay(day)) {
      return { title: day!.name.replace(/\s*\(opcional\)\s*$/i, '') || DAY_FULL_NAMES[dayKeyOf(date)], when: inDays === 1 ? 'amanhã' : `em ${inDays} dias` };
    }
  }
  return null;
}
