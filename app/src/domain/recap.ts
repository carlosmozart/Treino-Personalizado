// V4: resumo da semana que passou e do mês que passou, num cartão do Início. Calculado no
// aparelho; uma semana (ou mês) sem treino não ganha resumo.
import { groupOf } from '../data/exercise-library';
import { addDays, fromDateKey, toDateKey, weekStartOf, type DateKey } from './dates';
import { weekStartSetting, type AppData } from './model';
import { recordKinds } from './strength';
import { volumeOptions, workoutVolume, workSets } from './workouts';

export type RecapKind = 'semana' | 'mes';

export interface Recap {
  kind: RecapKind;
  /** Chave do período (início da semana ou "2026-10"), para lembrar que foi fechado. */
  id: string;
  from: DateKey;
  to: DateKey;
  /** "3 a 9 de nov." ou "outubro". */
  label: string;
  workouts: number;
  days: number;
  volume: number;
  records: number;
  /** O grupo com mais séries no período. */
  topGroup: string | null;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;
const SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'] as const;
/** Os cartões aparecem nos primeiros dias da semana ou do mês seguinte. */
export const RECAP_DAYS = 3;

function weekLabel(from: DateKey, to: DateKey): string {
  const a = fromDateKey(from), b = fromDateKey(to);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${SHORT[b.getMonth()]}`
    : `${a.getDate()} de ${SHORT[a.getMonth()]} a ${b.getDate()} de ${SHORT[b.getMonth()]}`;
}

/** Os números de um período (datas inclusive). */
export function periodRecap(data: Pick<AppData, 'workouts' | 'settings'> & Partial<Pick<AppData, 'profile'>>, kind: RecapKind, from: DateKey, to: DateKey, label: string, id: string): Recap {
  const inside = data.workouts.filter(w => w.date >= from && w.date <= to);
  const sets = new Map<string, number>();
  let records = 0;
  for (const w of inside) {
    for (const e of w.entries) {
      const g = groupOf(e.name, data.settings.customExercises);
      if (g && g !== 'Cardio') sets.set(g, (sets.get(g) ?? 0) + workSets(e).length);
      if (recordKinds(data.workouts, w, e).length) records++;
    }
  }
  const top = [...sets].sort((a, b) => b[1] - a[1])[0];
  return {
    kind, id, from, to, label,
    workouts: inside.length, days: new Set(inside.map(w => w.date)).size,
    volume: Math.round(inside.reduce((n, w) => n + workoutVolume(w, volumeOptions(data)), 0)),
    records, topGroup: top?.[0] ?? null
  };
}

/**
 * Os resumos a mostrar hoje: o da semana que acabou (nos primeiros dias da semana nova) e o do mês
 * que acabou (nos primeiros dias do mês). Sem treino no período, nada.
 */
export function recapsFor(data: Pick<AppData, 'workouts' | 'settings'> & Partial<Pick<AppData, 'profile'>>, now: Date): Recap[] {
  const today = toDateKey(now);
  const out: Recap[] = [];
  const thisWeek = weekStartOf(today, weekStartSetting(data.settings));
  if (today < addDays(thisWeek, RECAP_DAYS)) {
    const from = addDays(thisWeek, -7), to = addDays(thisWeek, -1);
    const r = periodRecap(data, 'semana', from, to, weekLabel(from, to), from);
    if (r.workouts) out.push(r);
  }
  if (now.getDate() <= RECAP_DAYS) {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    const from = toDateKey(first), to = toDateKey(last);
    const r = periodRecap(data, 'mes', from, to, MONTHS[first.getMonth()]!, from.slice(0, 7));
    if (r.workouts) out.push(r);
  }
  return out;
}
