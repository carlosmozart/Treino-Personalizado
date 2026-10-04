// O que a tela de Progresso mostra (N9, M16, M28), calculado a partir dos dados.
import { addDays, mondayOf, toDateKey, type DateKey } from './dates';
import type { AppData, Workout } from './model';
import { streakOf } from './rewards';
import { groupOf } from '../data/exercise-library';
import { workSets } from './workouts';

export interface StatsSummary {
  totalWorkouts: number;
  thisMonth: number;
  streak: number;
  longestStreak: number;
  /** Variação de peso nos últimos 30 dias (null sem duas pesagens no período). */
  weight30d: number | null;
}

export function statsSummary(data: AppData, now: Date): StatsSummary {
  const today = toDateKey(now);
  const month = today.slice(0, 7);
  const streak = streakOf(data, now);
  const since = addDays(today, -30);
  const recent = data.profile.weighIns.filter(w => w.date >= since);
  const weight30d = recent.length >= 2 ? Math.round((recent[recent.length - 1]!.weight - recent[0]!.weight) * 10) / 10 : null;
  return {
    totalWorkouts: data.workouts.length,
    thisMonth: Object.keys(data.checkins).filter(d => d.startsWith(month)).length,
    streak,
    longestStreak: Math.max(streak, data.gamification.longestStreak),
    weight30d
  };
}

/** Intensidade do dia no mapa de calor: 0 nada, 1 presença sem séries, 2 treino, 3 treino forte. */
export type HeatLevel = 0 | 1 | 2 | 3;
export interface HeatCell { date: DateKey; level: HeatLevel; future: boolean }

/** Semanas (colunas de segunda a domingo) terminando na semana atual (M16). */
export function heatmap(data: AppData, now: Date, weeks = 26): HeatCell[][] {
  const today = toDateKey(now);
  const sets = new Map<DateKey, number>();
  for (const w of data.workouts) sets.set(w.date, (sets.get(w.date) ?? 0) + w.entries.reduce((n, e) => n + workSets(e).length + (e.cardio ? 3 : 0), 0));
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, c) => Array.from({ length: 7 }, (_, r) => {
    const date = addDays(start, c * 7 + r);
    const n = sets.get(date) ?? 0;
    const level: HeatLevel = n >= 20 ? 3 : n > 0 ? 2 : data.checkins[date] ? 1 : 0;
    return { date, level, future: date > today };
  }));
}

/** Séries feitas por grupo muscular no período, maior primeiro (M28). */
export function muscleBalance(data: AppData, now: Date, days = 30): { group: string; sets: number }[] {
  const since = addDays(toDateKey(now), -days);
  const totals = new Map<string, number>();
  for (const w of data.workouts) {
    if (w.date < since) continue;
    for (const e of w.entries) {
      const group = groupOf(e.name);
      if (!group || group === 'Cardio') continue;
      totals.set(group, (totals.get(group) ?? 0) + workSets(e).length);
    }
  }
  return [...totals].map(([group, sets]) => ({ group, sets })).filter(g => g.sets > 0).sort((a, b) => b.sets - a.sets);
}

/** Histórico por mês, do mais recente para o mais antigo. */
export function historyByMonth(workouts: readonly Workout[]): { month: string; workouts: Workout[] }[] {
  const sorted = [...workouts].sort((a, b) => (b.date + (b.startedAt ?? '')).localeCompare(a.date + (a.startedAt ?? '')));
  const out: { month: string; workouts: Workout[] }[] = [];
  for (const w of sorted) {
    const month = w.date.slice(0, 7);
    const last = out[out.length - 1];
    if (last?.month === month) last.workouts.push(w);
    else out.push({ month, workouts: [w] });
  }
  return out;
}
