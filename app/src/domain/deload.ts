// M32: semana de deload (carga e volume mais leves para recuperar). Os treinos dela entram no
// histórico com a marca `deload`, mas a progressão e a carga sugerida ao abrir o treino olham só
// os treinos normais: depois do deload, o app volta de onde a pessoa estava, sem mandar baixar.
import { addDays, toDateKey, weekStartOf, type DateKey } from './dates';
import { weekStartSetting, type AppData, type Workout } from './model';
import { key, touch } from './sync';
import type { ActionResult } from './actions';

/** A data cai na semana marcada como deload. */
export function isDeloadDate(data: AppData, date: DateKey): boolean {
  const start = data.settings.deloadWeek;
  return !!start && date >= start && date <= addDays(start, 6);
}

/** Os treinos que contam para a progressão: todos menos os de deload. */
export const progressionWorkouts = (workouts: readonly Workout[]): readonly Workout[] =>
  (workouts.some(w => w.deload) ? workouts.filter(w => !w.deload) : workouts);

/** Marca (ou desmarca) a semana atual como deload, junto com os treinos já feitos nela. */
export function setDeloadWeek(data: AppData, on: boolean, now: Date): ActionResult {
  const today = toDateKey(now);
  if (on === isDeloadDate(data, today)) return { data, events: [] };
  const start = on ? weekStartOf(today, weekStartSetting(data.settings)) : data.settings.deloadWeek!;
  const end = addDays(start, 6);
  const settings = { ...data.settings };
  if (on) settings.deloadWeek = start;
  else delete settings.deloadWeek;
  const draft: AppData = { ...data, settings, sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } } };
  touch(draft, key.settings, now);
  draft.workouts = data.workouts.map(w => {
    if (w.date < start || w.date > end || !!w.deload === on) return w;
    touch(draft, key.workout(w.id), now);
    if (on) return { ...w, deload: true };
    const { deload: _deload, ...rest } = w;
    return rest;
  });
  return { data: draft, events: [] };
}
