// Dados prontos para sincronizar: carimbo de alteração por registro, registro de exclusões e a
// junção de duas cópias (dois aparelhos, ou aparelho e nuvem). Vale para qualquer nuvem escolhida
// (servidor próprio ou Firebase): o transporte muda, a junção é esta.
import { computeTotalXP, type AppData, type Gamification, type SyncKey } from './model';

export const key = {
  workout: (id: string): SyncKey => `workout:${id}`,
  plan: (id: string): SyncKey => `plan:${id}`,
  weighIn: (date: string): SyncKey => `weighin:${date}`,
  checkin: (date: string): SyncKey => `checkin:${date}`,
  water: (date: string): SyncKey => `water:${date}`,
  dayNote: (date: string): SyncKey => `daynote:${date}`,
  measure: (date: string): SyncKey => `measure:${date}`,
  profile: 'profile' as SyncKey,
  settings: 'settings' as SyncKey,
  activePlan: 'activePlan' as SyncKey
};

/** Marca um registro como alterado agora (e desfaz uma exclusão anterior dele). */
export function touch(draft: AppData, k: SyncKey, now: Date): void {
  draft.sync.changed[k] = now.toISOString();
  delete draft.sync.deleted[k];
}

/** Marca um registro como apagado agora. */
export function tombstone(draft: AppData, k: SyncKey, now: Date): void {
  draft.sync.deleted[k] = now.toISOString();
  delete draft.sync.changed[k];
}

/** Carimba todos os registros existentes (dados migrados ou criados antes dos carimbos). */
export function stampAll(data: AppData, now: Date): AppData {
  const iso = now.toISOString();
  const changed: Record<SyncKey, string> = { ...data.sync.changed };
  const add = (k: SyncKey) => { changed[k] ??= iso; };
  data.workouts.forEach(w => add(key.workout(w.id)));
  Object.keys(data.plans).forEach(id => add(key.plan(id)));
  data.profile.weighIns.forEach(w => add(key.weighIn(w.date)));
  Object.keys(data.checkins).forEach(d => add(key.checkin(d)));
  Object.keys(data.water).forEach(d => add(key.water(d)));
  Object.keys(data.dayNotes ?? {}).forEach(d => add(key.dayNote(d)));
  Object.keys(data.measurements ?? {}).forEach(d => add(key.measure(d)));
  [key.profile, key.settings, key.activePlan].forEach(add);
  return { ...data, sync: { changed, deleted: { ...data.sync.deleted } } };
}

const newer = (a: string | undefined, b: string | undefined) => (a ?? '') >= (b ?? '');

type Side = { data: AppData; stamp(k: SyncKey): string | undefined };

/**
 * Para cada chave, vence a alteração ou exclusão mais recente entre as duas cópias. Empate fica
 * com `a` (o aparelho local). Devolve se o registro fica, e de qual lado vem.
 */
function pick(k: SyncKey, a: Side, b: Side, inA: boolean, inB: boolean, deleted: Record<SyncKey, string>): 'a' | 'b' | null {
  const latestChange = newer(a.stamp(k), b.stamp(k)) ? a.stamp(k) : b.stamp(k);
  const deletedAt = deleted[k];
  if (deletedAt && newer(deletedAt, latestChange)) return null;
  if (inA && (!inB || newer(a.stamp(k), b.stamp(k)))) return 'a';
  return inB ? 'b' : null;
}

function mergeRecords<T>(
  prefix: (id: string) => SyncKey, ka: Record<string, T>, kb: Record<string, T>, a: Side, b: Side, deleted: Record<SyncKey, string>
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const id of new Set([...Object.keys(ka), ...Object.keys(kb)])) {
    const side = pick(prefix(id), a, b, id in ka, id in kb, deleted);
    if (side) out[id] = (side === 'a' ? ka[id] : kb[id])!;
  }
  return out;
}

/** Bônus e recordes de recompensa: tudo o que foi conquistado em qualquer aparelho fica. */
function mergeGamification(ga: Gamification, gb: Gamification, checkinDates: Set<string>): Gamification {
  const union = <V>(x: Record<string, V>, y: Record<string, V>, keep: (p: V, q: V) => V) => {
    const out: Record<string, V> = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = k in out ? keep(out[k]!, v) : v;
    return out;
  };
  const max = (p: number, q: number) => Math.max(p, q);
  const first = <V>(p: V) => p;
  const checkinXP = union(ga.checkinXP, gb.checkinXP, (p, q) => (q.amount > p.amount ? q : p));
  // XP de check-in só vale para dias que continuam com check-in depois da junção
  for (const date of Object.keys(checkinXP)) if (!checkinDates.has(date)) delete checkinXP[date];
  const merged: Gamification = {
    totalXP: 0,
    baseXP: Math.max(ga.baseXP, gb.baseXP),
    longestStreak: Math.max(ga.longestStreak, gb.longestStreak),
    checkinXP,
    waterBonus: union(ga.waterBonus, gb.waterBonus, max),
    streakBonuses: union(ga.streakBonuses, gb.streakBonuses, max),
    freeMealRewards: union(ga.freeMealRewards, gb.freeMealRewards, first),
    achievements: union(ga.achievements, gb.achievements, (p, q) => (p <= q ? p : q)),
    birthdayGreeted: union(ga.birthdayGreeted, gb.birthdayGreeted, first),
    nightCheckins: union(ga.nightCheckins, gb.nightCheckins, first),
    activatedPlans: union(ga.activatedPlans, gb.activatedPlans, first),
    bigWeightJump: ga.bigWeightJump || gb.bigWeightJump
  };
  merged.totalXP = computeTotalXP(merged);
  return merged;
}

/**
 * Junta duas cópias dos dados. `a` é a local (vence empates). O resultado não depende de quantas
 * vezes se junta: juntar de novo com qualquer uma das cópias não muda nada.
 */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  const deleted: Record<SyncKey, string> = { ...remote.sync.deleted };
  for (const [k, at] of Object.entries(local.sync.deleted)) if (newer(at, deleted[k])) deleted[k] = at;
  const a: Side = { data: local, stamp: k => local.sync.changed[k] };
  const b: Side = { data: remote, stamp: k => remote.sync.changed[k] };

  const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map(x => [x.id, x]));
  const byDate = <T extends { date: string }>(list: T[]) => Object.fromEntries(list.map(x => [x.date, x]));
  const workouts = Object.values(mergeRecords(key.workout, byId(local.workouts), byId(remote.workouts), a, b, deleted))
    .sort((x, y) => (x.date !== y.date ? (x.date < y.date ? -1 : 1) : (x.startedAt ?? '').localeCompare(y.startedAt ?? '')));
  const plans = mergeRecords(key.plan, local.plans, remote.plans, a, b, deleted);
  const weighIns = Object.values(mergeRecords(key.weighIn, byDate(local.profile.weighIns), byDate(remote.profile.weighIns), a, b, deleted))
    .sort((x, y) => x.date.localeCompare(y.date));
  const checkins = mergeRecords(key.checkin, local.checkins, remote.checkins, a, b, deleted);
  const water = mergeRecords(key.water, local.water, remote.water, a, b, deleted);
  const dayNotes = mergeRecords(key.dayNote, local.dayNotes ?? {}, remote.dayNotes ?? {}, a, b, deleted);
  const measurements = mergeRecords(key.measure, local.measurements ?? {}, remote.measurements ?? {}, a, b, deleted);

  const whole = <K extends 'profile' | 'settings'>(k: SyncKey, field: K): AppData[K] =>
    (newer(a.stamp(k), b.stamp(k)) ? local[field] : remote[field]);
  const profile = { ...whole(key.profile, 'profile'), weighIns };
  const latest = weighIns[weighIns.length - 1];
  if (latest) profile.weightKg = latest.weight;
  let activePlanId = newer(a.stamp(key.activePlan), b.stamp(key.activePlan)) ? local.activePlanId : remote.activePlanId;
  if (activePlanId && !plans[activePlanId]) activePlanId = Object.keys(plans)[0] ?? null;

  const changed: Record<SyncKey, string> = { ...remote.sync.changed };
  for (const [k, at] of Object.entries(local.sync.changed)) if (newer(at, changed[k])) changed[k] = at;
  for (const [k, at] of Object.entries(deleted)) if (newer(at, changed[k])) delete changed[k]; else delete deleted[k];

  return {
    schemaVersion: local.schemaVersion,
    profile,
    plans,
    activePlanId,
    workouts,
    checkins,
    water,
    ...(Object.keys(dayNotes).length ? { dayNotes } : {}),
    ...(Object.keys(measurements).length ? { measurements } : {}),
    gamification: mergeGamification(local.gamification, remote.gamification, new Set(Object.keys(checkins))),
    settings: whole(key.settings, 'settings'),
    sync: { changed, deleted },
    meta: {
      ...local.meta,
      hintsSeen: { ...remote.meta.hintsSeen, ...local.meta.hintsSeen }
    }
  };
}

/**
 * Completa dados gravados antes dos carimbos e do XP por registro (versões de desenvolvimento
 * da 3.0 e backups delas): carimba tudo, troca bônus `true` por 0 e põe o resto do total na base.
 */
export function normalizeAppData(data: AppData, now: Date): AppData {
  const g = data.gamification as Gamification & { baseXP?: number };
  const toAmounts = (r: Record<string, number | boolean>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? v : 0]));
  let out = data;
  if (typeof g.baseXP !== 'number' || Object.values({ ...g.waterBonus, ...g.streakBonuses }).some(v => typeof v !== 'number')) {
    const gamification: Gamification = { ...g, baseXP: 0, waterBonus: toAmounts(g.waterBonus), streakBonuses: toAmounts(g.streakBonuses) };
    gamification.baseXP = Math.max(0, g.totalXP - computeTotalXP(gamification));
    gamification.totalXP = computeTotalXP(gamification);
    out = { ...out, gamification };
  }
  if (!(out as Partial<AppData>).sync) out = stampAll({ ...out, sync: { changed: {}, deleted: {} } }, now);
  return out;
}
