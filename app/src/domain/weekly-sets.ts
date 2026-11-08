// V3: séries de trabalho da semana por grupo muscular contra uma faixa-alvo ("Peito 14 / 10–20").
// As faixas partem do que a pesquisa de hipertrofia costuma indicar (o mínimo que faz crescer até o
// máximo que se recupera) e cada uma pode ser mudada pela pessoa. Nunca é bronca: falta, na faixa
// ou acima.
import { groupOf, MUSCLE_GROUPS } from '../data/exercise-library';
import { addDays, toDateKey, weekStartOf } from './dates';
import { weekStartSetting, type AppData, type Settings } from './model';
import { workSets } from './workouts';

export interface SetRange { min: number; max: number }

/** Faixas padrão por grupo (séries de trabalho por semana). */
export const DEFAULT_SET_TARGETS: Record<string, SetRange> = {
  Peito: { min: 10, max: 20 },
  Costas: { min: 10, max: 20 },
  Ombro: { min: 8, max: 16 },
  'Bíceps': { min: 6, max: 14 },
  'Tríceps': { min: 6, max: 14 },
  'Pernas (Quadríceps)': { min: 10, max: 20 },
  'Pernas (Posterior/Glúteo)': { min: 10, max: 20 },
  Panturrilha: { min: 6, max: 12 },
  'Abdômen / Core': { min: 6, max: 15 }
};

export const TARGET_GROUPS = MUSCLE_GROUPS.filter(g => g !== 'Cardio');

/** A faixa do grupo: a da pessoa ou a padrão; limites corrigidos (0 a 40, mínimo ≤ máximo). */
export function targetFor(settings: Pick<Settings, 'weeklySetTargets'>, group: string): SetRange {
  const own = settings.weeklySetTargets?.[group];
  const base = own ?? DEFAULT_SET_TARGETS[group] ?? { min: 6, max: 15 };
  const min = Math.min(40, Math.max(0, Math.round(base.min)));
  return { min, max: Math.min(40, Math.max(min, Math.round(base.max))) };
}

export type SetStatus = 'falta' | 'na faixa' | 'acima';
export interface GroupWeek { group: string; sets: number; target: SetRange; status: SetStatus; /** Séries que faltam para o mínimo. */ missing: number }

/** As séries da semana atual (começando no dia escolhido em Perfil) por grupo, na ordem da biblioteca. */
export function weeklySets(data: Pick<AppData, 'workouts' | 'settings'>, now: Date): GroupWeek[] {
  const start = weekStartOf(toDateKey(now), weekStartSetting(data.settings));
  const end = addDays(start, 6);
  const totals = new Map<string, number>();
  for (const w of data.workouts) {
    if (w.date < start || w.date > end) continue;
    for (const e of w.entries) {
      const g = groupOf(e.name, data.settings.customExercises);
      if (!g || g === 'Cardio') continue;
      totals.set(g, (totals.get(g) ?? 0) + workSets(e).length);
    }
  }
  return TARGET_GROUPS.map(group => {
    const sets = totals.get(group) ?? 0;
    const target = targetFor(data.settings, group);
    const status: SetStatus = sets < target.min ? 'falta' : sets > target.max ? 'acima' : 'na faixa';
    return { group, sets, target, status, missing: Math.max(0, target.min - sets) };
  });
}

/** Para a linha do Início: o grupo com mais espaço até o mínimo (null se todos já chegaram). */
export function mostRoom(weeks: readonly GroupWeek[]): GroupWeek | null {
  const behind = weeks.filter(w => w.missing > 0).sort((a, b) => b.missing - a.missing || a.sets - b.sets);
  return behind[0] ?? null;
}

/** Muda a faixa de um grupo; igual à padrão, volta a não guardar nada. */
export function withTarget(settings: Pick<Settings, 'weeklySetTargets'>, group: string, range: SetRange): Record<string, SetRange> {
  const next = { ...(settings.weeklySetTargets ?? {}) };
  const fixed = targetFor({ weeklySetTargets: { [group]: range } }, group);
  const def = DEFAULT_SET_TARGETS[group];
  if (def && def.min === fixed.min && def.max === fixed.max) delete next[group];
  else next[group] = fixed;
  return next;
}
