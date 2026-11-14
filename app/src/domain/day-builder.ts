// W7: montar o treino do dia pelos grupos: a pessoa escolhe os grupos e o tempo (20, 40 ou 60
// min) e o app escolhe os exercícios com o equipamento que ela tem (M36), os favoritos primeiro e
// depois os que ela mais faz. Sai um treino livre, com a carga da última vez de cada um.
import { EXERCISE_LIBRARY, fitsEquipment, groupOf } from '../data/exercise-library';
import { addDays, type DateKey } from './dates';
import type { AppData } from './model';
import { addExerciseToSession, startFreeSession, type ActiveSession } from './session';
import { normalizeExerciseName } from './text';

export const BUILD_MINUTES = [20, 40, 60] as const;
export type BuildMinutes = (typeof BUILD_MINUTES)[number];

/** Exercícios por duração (uns 8 a 10 minutos cada, com o descanso). */
const COUNT: Record<BuildMinutes, number> = { 20: 3, 40: 5, 60: 7 };

/** Grupos treinados ontem (para avisar; a escolha continua da pessoa). */
export function groupsTrainedOn(data: Pick<AppData, 'workouts' | 'settings'>, date: DateKey): string[] {
  const out = new Set<string>();
  for (const w of data.workouts) if (w.date === date) for (const e of w.entries) {
    const g = groupOf(e.name, data.settings.customExercises);
    if (g) out.add(g);
  }
  return [...out];
}

export const yesterdayGroups = (data: Pick<AppData, 'workouts' | 'settings'>, today: DateKey) => groupsTrainedOn(data, addDays(today, -1));

/** Os exercícios escolhidos, um grupo de cada vez, na ordem em que os grupos foram tocados. */
export function buildDay(data: Pick<AppData, 'workouts' | 'settings'>, groups: readonly string[], minutes: BuildMinutes): string[] {
  if (!groups.length) return [];
  const s = data.settings;
  const favorites = new Set(s.favorites ?? []);
  const times = new Map<string, number>();
  for (const w of data.workouts) for (const e of w.entries) times.set(e.key, (times.get(e.key) ?? 0) + 1);
  const pools = groups.map(g => {
    const names = [...(EXERCISE_LIBRARY[g] ?? []), ...(s.customExercises ?? []).filter(c => c.group === g).map(c => c.name)]
      .filter(n => fitsEquipment(n, s.availableEquipment, s.customExercises));
    // favoritos, depois os mais feitos, depois a ordem da biblioteca (os básicos vêm primeiro)
    return names.map((n, i) => {
      const k = normalizeExerciseName(n);
      return { n, rank: (favorites.has(k) ? -1000 : 0) - (times.get(k) ?? 0) * 10 + i };
    }).sort((a, b) => a.rank - b.rank).map(x => x.n);
  });
  const total = COUNT[minutes];
  const out: string[] = [];
  for (let round = 0; out.length < total && round < 10; round++) {
    let added = false;
    for (const pool of pools) {
      if (out.length >= total) break;
      const next = pool.find(n => !out.includes(n));
      if (next) { out.push(next); added = true; }
    }
    if (!added) break;
  }
  return out;
}

/** O treino livre já com os exercícios montados. */
export function startBuiltSession(data: AppData, groups: readonly string[], names: readonly string[], now: Date, id: string): ActiveSession {
  let s = startFreeSession(now, id);
  for (const n of names) s = addExerciseToSession(s, data, n);
  const title = groups.length <= 3 ? groups.join(', ') : `${groups.slice(0, 2).join(', ')} e mais`;
  return { ...s, dayName: `Treino do dia: ${title}` };
}
