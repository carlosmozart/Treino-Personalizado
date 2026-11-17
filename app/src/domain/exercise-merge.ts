// V10: juntar dois exercícios (nomes duplicados da migração, "supino" e "Supino Reto (Barra)").
// O histórico, os planos, os favoritos e os apelidos de um passam para o outro; o nome antigo vira
// apelido do novo, para a busca ainda achar. T16: os apelidos em si.
import type { ActionResult } from './actions';
import type { AppData, Plan, Settings, Workout } from './model';
import { key, touch } from './sync';
import { normalizeExerciseName } from './text';

export interface MergePreview { workouts: number; sets: number; plans: number }

/** O que muda ao juntar `from` em `to`. */
export function mergePreview(data: Pick<AppData, 'workouts' | 'plans'>, from: string, _to?: string): MergePreview {
  const k = normalizeExerciseName(from);
  let workouts = 0, sets = 0;
  for (const w of data.workouts) {
    const es = w.entries.filter(e => e.key === k);
    if (es.length) { workouts++; sets += es.reduce((n, e) => n + e.sets.length, 0); }
  }
  const plans = Object.values(data.plans).filter(p => Object.values(p.days).some(d => d.exercises.some(e => normalizeExerciseName(e.name) === k || e.alternatives.some(a => normalizeExerciseName(a.name) === k)))).length;
  return { workouts, sets, plans };
}

/** O que precisa voltar no Desfazer. */
export interface MergeUndo { workouts: Workout[]; plans: Plan[]; settings: Settings }

const cloneSync = (d: AppData) => ({ changed: { ...d.sync.changed }, deleted: { ...d.sync.deleted } });

export function mergeExercises(data: AppData, from: string, to: string, now: Date): { result: ActionResult; undo: MergeUndo } {
  const kFrom = normalizeExerciseName(from), kTo = normalizeExerciseName(to), toName = to.trim();
  const undo: MergeUndo = { workouts: [], plans: [], settings: data.settings };
  if (!kFrom || !kTo || kFrom === kTo) return { result: { data, events: [] }, undo };
  const draft: AppData = { ...data, sync: cloneSync(data) };
  draft.workouts = data.workouts.map(w => {
    if (!w.entries.some(e => e.key === kFrom)) return w;
    undo.workouts.push(w);
    touch(draft, key.workout(w.id), now);
    return { ...w, entries: w.entries.map(e => (e.key === kFrom ? { ...e, key: kTo, name: toName } : e)) };
  });
  const plans: Record<string, Plan> = {};
  for (const [id, p] of Object.entries(data.plans)) {
    let changed = false;
    const days = Object.fromEntries(Object.entries(p.days).map(([dk, day]) => [dk, {
      ...day,
      exercises: day.exercises.map(e => {
        const renamed = normalizeExerciseName(e.name) === kFrom;
        const touchesAlt = e.alternatives.some(a => normalizeExerciseName(a.name) === kFrom);
        if (!renamed && !touchesAlt) return e;
        changed = true;
        const own = renamed ? kTo : normalizeExerciseName(e.name);
        // reservas: o nome antigo vira o novo, sem repetir e sem a reserva ser o próprio exercício
        const seen = new Set<string>();
        const alternatives = e.alternatives.map(a => (normalizeExerciseName(a.name) === kFrom ? { ...a, name: toName } : a)).filter(a => {
          const k = normalizeExerciseName(a.name);
          if (k === own || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        return { ...e, ...(renamed ? { name: toName } : {}), alternatives };
      })
    }])) as Plan['days'];
    if (changed) { undo.plans.push(p); touch(draft, key.plan(id), now); plans[id] = { ...p, days }; } else plans[id] = p;
  }
  draft.plans = plans;
  // favoritos, exercícios próprios e apelidos: o antigo vira apelido do novo
  const s = data.settings;
  const favorites = s.favorites?.includes(kFrom) ? [...new Set(s.favorites.map(f => (f === kFrom ? kTo : f)))] : s.favorites;
  const customExercises = s.customExercises?.filter(c => normalizeExerciseName(c.name) !== kFrom);
  const aliases = { ...(s.aliases ?? {}) };
  const moved = [...(aliases[kTo] ?? []), ...(aliases[kFrom] ?? []), from.trim()];
  delete aliases[kFrom];
  aliases[kTo] = [...new Map(moved.map(a => [normalizeExerciseName(a), a.trim()])).values()].filter(a => normalizeExerciseName(a) !== kTo).slice(0, 10);
  draft.settings = {
    ...s, aliases,
    ...(favorites ? { favorites } : {}),
    ...(customExercises && customExercises.length !== s.customExercises?.length ? { customExercises } : {})
  };
  touch(draft, key.settings, now);
  return { result: { data: draft, events: [] }, undo };
}

/** Desfaz a junção: os treinos, planos e ajustes voltam como estavam. */
export function undoMerge(data: AppData, undo: MergeUndo, now: Date): ActionResult {
  const draft: AppData = { ...data, sync: cloneSync(data), settings: undo.settings };
  touch(draft, key.settings, now);
  const back = new Map(undo.workouts.map(w => [w.id, w]));
  draft.workouts = data.workouts.map(w => {
    const old = back.get(w.id);
    if (!old) return w;
    touch(draft, key.workout(w.id), now);
    return old;
  });
  const plans = { ...data.plans };
  for (const p of undo.plans) if (plans[p.id]) { plans[p.id] = p; touch(draft, key.plan(p.id), now); }
  draft.plans = plans;
  return { data: draft, events: [] };
}

/** T16: os outros nomes de um exercício (vazio apaga). Até 10, sem repetir nem o próprio nome. */
export function setAliases(data: AppData, name: string, list: readonly string[], now: Date): ActionResult {
  const k = normalizeExerciseName(name);
  const clean = [...new Map(list.map(a => a.trim().slice(0, 60)).filter(Boolean).map(a => [normalizeExerciseName(a), a])).values()]
    .filter(a => normalizeExerciseName(a) !== k).slice(0, 10);
  const aliases = { ...(data.settings.aliases ?? {}) };
  if (clean.length) aliases[k] = clean; else delete aliases[k];
  const draft: AppData = { ...data, sync: cloneSync(data), settings: { ...data.settings, aliases } };
  touch(draft, key.settings, now);
  return { data: draft, events: [] };
}
