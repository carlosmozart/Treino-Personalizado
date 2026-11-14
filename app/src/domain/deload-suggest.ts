// W9: sugerir uma semana de deload (M32 continua sendo a pessoa quem marca). Três motivos: o
// tempo (a cada N semanas, se a pessoa quiser), as cargas caindo duas semanas seguidas nos
// exercícios que ela mais faz, ou o check-in do dia ruim nos últimos treinos (W2).
import { roughDay } from './daily-form';
import { addDays, toDateKey, weekStartOf, type DateKey } from './dates';
import { isDeloadDate } from './deload';
import { weekStartSetting, type AppData } from './model';
import { e1rm } from './strength';
import { workSets } from './workouts';

export type DeloadReason = 'tempo' | 'cargas' | 'cansaco';

export interface DeloadSuggestion {
  reason: DeloadReason;
  text: string;
  /** Início da semana atual (para lembrar que foi dispensada). */
  week: DateKey;
}

const WEEK = 7;

/** O último deload: a semana marcada ou o treino mais recente feito em deload. */
function lastDeload(data: Pick<AppData, 'workouts' | 'settings'>): DateKey | null {
  let last: DateKey | null = data.settings.deloadWeek ?? null;
  for (const w of data.workouts) if (w.deload && (!last || w.date > last)) last = w.date;
  return last;
}

/** Melhor 1RM estimado de cada exercício por semana (`weeks` semanas antes desta, em ordem). */
function weeklyBests(data: Pick<AppData, 'workouts'>, thisWeek: DateKey, weeks: number): Map<string, (number | null)[]> {
  const out = new Map<string, (number | null)[]>();
  for (let i = 0; i < weeks; i++) {
    const from = addDays(thisWeek, -WEEK * (weeks - i)), to = addDays(from, WEEK - 1);
    for (const w of data.workouts) {
      if (w.date < from || w.date > to || w.deload || w.light) continue;
      for (const e of w.entries) {
        const best = Math.max(0, ...workSets(e).map(s => e1rm(s.weight, s.reps) ?? 0));
        if (!best) continue;
        const row = out.get(e.key) ?? Array.from({ length: weeks }, () => null);
        row[i] = Math.max(row[i] ?? 0, best);
        out.set(e.key, row);
      }
    }
  }
  return out;
}

export function deloadSuggestion(data: Pick<AppData, 'workouts' | 'settings'>, now: Date): DeloadSuggestion | null {
  const today = toDateKey(now);
  const week = weekStartOf(today, weekStartSetting(data.settings));
  if (isDeloadDate(data, today) || !data.workouts.length) return null;
  const last = lastDeload(data);
  // depois de um deload, pelo menos 3 semanas sem sugerir
  if (last && last >= addDays(week, -3 * WEEK)) return null;

  const every = data.settings.deloadEvery ?? 0;
  if (every > 0) {
    const since = last ?? data.workouts[0]!.date;
    const weeks = Math.floor((Date.parse(week) - Date.parse(weekStartOf(since, weekStartSetting(data.settings)))) / (WEEK * 86400000));
    if (weeks >= every) return { reason: 'tempo', week, text: `Já são ${weeks} semanas desde ${last ? 'o último deload' : 'o começo'}; você pediu um deload a cada ${every}.` };
  }
  if (data.settings.deloadSuggest === false) return null;

  // cargas: nos exercícios feitos nas 3 semanas anteriores, o melhor 1RM caiu duas semanas seguidas
  const rows = [...weeklyBests(data, week, 3).values()].filter((r): r is number[] => r.every(v => v !== null));
  const falling = rows.filter(([a, b, c]) => b! < a! && c! < b!).length;
  if (rows.length >= 2 && falling >= Math.ceil(rows.length / 2)) {
    return { reason: 'cargas', week, text: `As cargas caíram duas semanas seguidas em ${falling} de ${rows.length} exercícios que você mais faz.` };
  }
  // cansaço: 2 dos últimos 3 treinos com check-in de dia puxado
  const recent = data.workouts.filter(w => w.form).slice(-3);
  const rough = recent.filter(w => roughDay(w.form!)).length;
  if (recent.length >= 2 && rough >= 2) return { reason: 'cansaco', week, text: `O check-in do dia veio puxado em ${rough} dos seus últimos ${recent.length} treinos.` };
  return null;
}
