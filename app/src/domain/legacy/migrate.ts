// Conversão dos dados do app antigo para o AppData. Regras: docs/dev/modelo-de-dados.md.
// Função pura: recebe os valores já validados (parseLegacyData) e devolve dados + relatório.
import { normalizeExerciseName } from '../text';
import { toDateKey, type DateKey } from '../dates';
import { DAY_KEYS, type DayKey } from '../ai-plan';
import type { ActivityLevel, Sex, TmbFormulaId } from '../health';
import type { GoalMark, WeightGoal } from '../body-goal';
import {
  DEFAULT_SETTINGS, SCHEMA_VERSION, computeTotalXP, emptyGamification, emptyProfile,
  type AppData, type ExerciseMode, type Plan, type PlanDay, type PlanExercise, type Settings,
  type UserProfile, type Workout, type WorkoutEntry, type WorkoutSet
} from '../model';
import { stampAll } from '../sync';
import type { LegacyParseResult } from './validate';

type Obj = Record<string, unknown>;

export interface MigrationReport {
  plans: number;
  workouts: number;
  entries: number;
  /** Registros do formato antigo "3x10 · 40kg", reconstruídos como séries iguais. */
  aggregatedEntries: number;
  weighIns: number;
  checkins: number;
  /** Registros sem data utilizável ou sem nenhuma série — já não apareciam no app antigo. */
  skippedEntries: number;
  rejectedKeys: { key: string; reason: string }[];
}

export interface MigrationResult {
  data: AppData;
  report: MigrationReport;
}

const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isDateKey = (v: unknown): v is DateKey => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isDayKey = (v: unknown): v is DayKey => (DAY_KEYS as readonly unknown[]).includes(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const objOf = (v: unknown): Obj => (isObj(v) ? v : {});

/** Número de campo antigo (podia ser texto de formulário); vazio/ inválido → null. */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
const positive = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};
const trueKeys = (v: unknown): Record<string, true> =>
  Object.fromEntries(Object.entries(objOf(v)).filter(([, flag]) => flag === true).map(([k]) => [k, true as const]));

// ---------- perfil ----------

function migrateProfile(raw: unknown): UserProfile {
  const p = objOf(raw);
  const profile = emptyProfile();
  profile.name = str(p.name);
  profile.birthdate = str(p.birthdate);
  if (p.sex === 'masculino' || p.sex === 'feminino') profile.sex = p.sex as Sex;
  if (p.activityLevel === 'sedentario' || p.activityLevel === 'moderado' || p.activityLevel === 'intenso') {
    profile.activityLevel = p.activityLevel as ActivityLevel;
  }
  if (p.tmbFormula === 'mifflin' || p.tmbFormula === 'harris' || p.tmbFormula === 'katch') {
    profile.tmbFormula = p.tmbFormula as TmbFormulaId;
  }
  profile.heightCm = positive(p.height);
  profile.weightKg = positive(p.weight);
  profile.targetWeightKg = positive(p.targetWeight);
  const bodyFat = positive(p.bodyFatPercent);
  profile.bodyFatPercent = bodyFat !== null && bodyFat < 100 ? bodyFat : null;

  if (isObj(p.weightGoal)) {
    const g = p.weightGoal;
    const goal: WeightGoal = { startWeight: Number(g.startWeight), targetWeight: Number(g.targetWeight), startedAt: str(g.startedAt) };
    const marks = Object.entries(objOf(g.checkpoints)).filter(([, date]) => isDateKey(date));
    if (marks.length) goal.checkpoints = Object.fromEntries(marks.map(([k, d]) => [Number(k) as GoalMark, d as DateKey]));
    profile.weightGoal = goal;
  }

  // Uma pesagem por dia (a última gravada vence), em ordem de data.
  const byDate = new Map<DateKey, number>();
  for (const row of Array.isArray(p.weightHistory) ? p.weightHistory : []) {
    const r = objOf(row);
    const weight = positive(r.weight);
    if (isDateKey(r.date) && weight !== null) byDate.set(r.date, weight);
  }
  profile.weighIns = [...byDate].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, weight]) => ({ date, weight }));
  return profile;
}

// ---------- planos ----------

function modeOf(type: unknown): ExerciseMode {
  return type === 'cardio' ? 'cardio' : 'reps';
}

function migrateExercise(raw: Obj): PlanExercise {
  const mode = modeOf(raw.type);
  const exercise: PlanExercise = {
    id: str(raw.id),
    name: str(raw.name).trim() || 'Exercício sem nome',
    mode,
    sets: positive(raw.targetSets) ?? (mode === 'cardio' ? 1 : 3),
    reps: positive(raw.targetReps) ?? 10,
    weight: num(raw.targetWeight) ?? 0,
    minutes: positive(raw.targetDuration) ?? 20,
    km: num(raw.targetDistance) ?? 0,
    optional: raw.optional === true,
    alternatives: (Array.isArray(raw.backups) ? raw.backups : [])
      .map(objOf)
      .filter(b => str(b.name).trim() !== '')
      .map(b => ({ name: str(b.name).trim(), mode: modeOf(b.type) }))
  };
  const tip = str(raw.alt).trim();
  if (tip) exercise.tip = tip.slice(0, 500);
  const rest = positive(raw.restSeconds);
  if (rest !== null) exercise.restSeconds = rest;
  return exercise;
}

function migratePlans(raw: unknown, today: DateKey): Record<string, Plan> {
  const plans: Record<string, Plan> = {};
  for (const [id, value] of Object.entries(objOf(raw))) {
    const p = objOf(value);
    const schedule = objOf(p.schedule);
    const days = Object.fromEntries(DAY_KEYS.map(key => {
      const d = objOf(schedule[key]);
      const day: PlanDay = {
        name: str(d.name),
        focus: str(d.focus),
        optional: d.optional === true,
        exercises: (Array.isArray(d.exercises) ? d.exercises : []).filter(isObj).map(migrateExercise)
      };
      return [key, day];
    })) as Record<DayKey, PlanDay>;
    plans[id] = {
      id, name: str(p.name) || 'Plano sem nome', description: str(p.description), trainingTime: str(p.trainingTime),
      createdAt: isDateKey(p.createdAt) ? p.createdAt : today, updatedAt: isDateKey(p.updatedAt) ? p.updatedAt : today, days
    };
  }
  return plans;
}

// ---------- treinos ----------

interface Located { plan: Plan; dayKey: DayKey; index: number }

/** Onde um exercício (pelo id do slot) está nos planos; prefere o dia do check-in. */
function locate(plans: Record<string, Plan>, exerciseId: string, preferDay: DayKey | null): Located | null {
  let fallback: Located | null = null;
  for (const plan of Object.values(plans)) {
    for (const dayKey of DAY_KEYS) {
      const index = plan.days[dayKey].exercises.findIndex(e => e.id === exerciseId);
      if (index === -1) continue;
      if (dayKey === preferDay) return { plan, dayKey, index };
      fallback ??= { plan, dayKey, index };
    }
  }
  return fallback;
}

function setsOf(entry: Obj): { sets: WorkoutSet[]; aggregated: boolean } {
  if (Array.isArray(entry.series) && entry.series.length) {
    const sets = entry.series.map(objOf).map(s => ({ reps: num(s.reps) ?? 0, weight: num(s.weight) ?? 0, kind: 'work' as const }));
    return { sets: sets.filter(s => s.reps > 0), aggregated: false };
  }
  const count = Math.max(0, Math.trunc(num(entry.sets) ?? 0));
  const reps = num(entry.reps) ?? 0;
  const weight = num(entry.weight) ?? 0;
  if (reps <= 0) return { sets: [], aggregated: true };
  return { sets: Array.from({ length: count }, () => ({ reps, weight, kind: 'work' as const })), aggregated: true };
}

function migrateWorkouts(values: LegacyParseResult['values'], plans: Record<string, Plan>,
  checkins: AppData['checkins']): { workouts: Workout[]; entries: number; aggregated: number; skipped: number } {
  const log = objOf(values.treino_session_log);
  const lastByExercise = objOf(values.treino_exercise_history);
  const meta = objOf(values.treino_workout_meta);

  // (chave do histórico, data) → registro; o session_log vence o exercise_history.
  const records: { historyKey: string; entry: Obj }[] = [];
  const seen = new Set<string>();
  for (const [historyKey, list] of Object.entries(log)) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (!isObj(entry)) continue;
      const id = `${historyKey}|${str(entry.date)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      records.push({ historyKey, entry });
    }
  }
  for (const [historyKey, entry] of Object.entries(lastByExercise)) {
    if (!isObj(entry) || seen.has(`${historyKey}|${str(entry.date)}`)) continue;
    seen.add(`${historyKey}|${str(entry.date)}`);
    records.push({ historyKey, entry });
  }

  const byDate = new Map<DateKey, { order: number; entry: WorkoutEntry; located: Located | null }[]>();
  let skipped = 0;
  let aggregated = 0;
  let sequence = 0;
  for (const { historyKey, entry } of records) {
    if (!isDateKey(entry.date)) { skipped++; continue; }
    const date = entry.date;
    const dayKey = checkins[date]?.dayKey ?? null;
    const exerciseId = historyKey.startsWith('custom__') ? '' : historyKey.split('__v')[0]!;
    const located = exerciseId ? locate(plans, exerciseId, dayKey) : null;
    const name = str(entry.name).trim() || (located ? located.plan.days[located.dayKey].exercises[located.index]!.name : historyKey);
    const mode = modeOf(entry.type);
    const out: WorkoutEntry = { key: normalizeExerciseName(name), name, mode, sets: [] };

    if (mode === 'cardio') {
      const minutes = positive(entry.duration);
      if (minutes === null) { skipped++; continue; }
      const km = positive(entry.distance);
      out.cardio = km === null ? { minutes } : { minutes, km };
    } else {
      const { sets, aggregated: isAggregated } = setsOf(entry);
      if (!sets.length) { skipped++; continue; }
      out.sets = sets;
      if (isAggregated) { out.aggregated = true; aggregated++; }
    }
    const note = str(entry.obs).trim();
    if (note) out.note = note;

    const list = byDate.get(date) ?? [];
    list.push({ order: located ? located.index : 1000 + sequence, entry: out, located });
    sequence++;
    byDate.set(date, list);
  }

  const workouts: Workout[] = [];
  let entries = 0;
  for (const [date, list] of [...byDate].sort(([a], [b]) => (a < b ? -1 : 1))) {
    list.sort((a, b) => a.order - b.order);
    const workout: Workout = { id: `m-${date}`, date, source: 'migrated', entries: list.map(i => i.entry) };
    const checkinDay = checkins[date]?.dayKey ?? null;
    const origin = list.find(i => i.located && (!checkinDay || i.located.dayKey === checkinDay))?.located ?? list.find(i => i.located)?.located;
    const dayKey = checkinDay ?? origin?.dayKey;
    if (dayKey) workout.dayKey = dayKey;
    if (origin) {
      workout.planId = origin.plan.id;
      const dayName = origin.plan.days[dayKey ?? origin.dayKey].name;
      if (dayName) workout.dayName = dayName;
    }
    const m = objOf(meta[date]);
    const minutes = positive(m.minutos);
    if (minutes !== null) workout.durationMin = Math.round(minutes);
    if (str(m.inicio)) workout.startedAt = str(m.inicio);
    if (str(m.fim)) workout.endedAt = str(m.fim);
    entries += workout.entries.length;
    workouts.push(workout);
  }
  return { workouts, entries, aggregated, skipped };
}

// ---------- demais dados ----------

function migrateSettings(raw: unknown): Settings {
  const s = objOf(raw);
  const settings: Settings = { ...DEFAULT_SETTINGS };
  const rest = positive(s.restSeconds);
  if (rest !== null) settings.restSeconds = Math.round(rest);
  for (const key of ['restAutoStart', 'restSound', 'restVibrate', 'trainingReminders',
    'restBackgroundNotification', 'restBackgroundHintShown'] as const) {
    if (typeof s[key] === 'boolean') settings[key] = s[key];
  }
  return settings;
}

function migrateGamification(raw: unknown): AppData['gamification'] {
  const g = objOf(raw);
  const out = emptyGamification();
  out.totalXP = Math.max(0, num(g.totalXP) ?? 0);
  out.longestStreak = Math.max(0, num(g.longestStreak) ?? 0);
  out.bigWeightJump = g.bigWeightJump === true;
  for (const [date, row] of Object.entries(objOf(g.checkins))) {
    const r = objOf(row);
    const amount = num(r.amount);
    if (isDateKey(date) && amount !== null) out.checkinXP[date] = { amount, full: r.full === true };
  }
  // o app antigo não guardava o XP de cada bônus: ficam com 0 e o valor deles vai para a base
  out.waterBonus = Object.fromEntries(Object.keys(trueKeys(g.waterBonus)).map(k => [k, 0]));
  out.streakBonuses = Object.fromEntries(Object.keys(trueKeys(g.streakBonuses)).map(k => [k, 0]));
  out.freeMealRewards = trueKeys(g.freeMealRewards);
  out.birthdayGreeted = trueKeys(g.birthdayGreeted);
  out.nightCheckins = trueKeys(g.nightCheckins);
  out.activatedPlans = trueKeys(g.equippedProfiles);
  out.achievements = Object.fromEntries(Object.entries(objOf(g.unlockedAchievements)).filter(([, d]) => typeof d === 'string')) as Record<string, string>;
  // o total do app antigo é preservado: o que não está nos registros de check-in vira base
  out.baseXP = Math.max(0, out.totalXP - computeTotalXP({ ...out, baseXP: 0 }));
  out.totalXP = computeTotalXP(out);
  return out;
}

export function migrateLegacy(parsed: LegacyParseResult, now = new Date()): MigrationResult {
  const { values } = parsed;
  const today = toDateKey(now);
  const plans = migratePlans(values.treino_profiles, today);
  const activeId = str(values.treino_active_profile_id);

  const checkins: AppData['checkins'] = {};
  for (const [date, value] of Object.entries(objOf(values.treino_checkins))) {
    if (isDateKey(date) && value !== false) checkins[date] = { dayKey: isDayKey(value) ? value : null };
  }
  const water: AppData['water'] = {};
  for (const [date, ml] of Object.entries(objOf(values.treino_water_log))) {
    const amount = positive(ml);
    if (isDateKey(date) && amount !== null) water[date] = amount;
  }

  const { workouts, entries, aggregated, skipped } = migrateWorkouts(values, plans, checkins);
  const profile = migrateProfile(values.treino_user_profile);

  const meta: AppData['meta'] = { hintsSeen: trueKeys(values.treino_hints_seen) };
  if (str(values.treino_last_backup_at)) meta.lastBackupAt = str(values.treino_last_backup_at);
  if (str(values.treino_last_seen_version)) meta.lastSeenVersion = str(values.treino_last_seen_version);

  const data: AppData = stampAll({
    schemaVersion: SCHEMA_VERSION,
    profile,
    plans,
    activePlanId: plans[activeId] ? activeId : Object.keys(plans)[0] ?? null,
    workouts,
    checkins,
    water,
    gamification: migrateGamification(values.treino_gamification),
    settings: migrateSettings(values.treino_settings),
    sync: { changed: {}, deleted: {} },
    meta
  }, now);

  return {
    data,
    report: {
      plans: Object.keys(plans).length, workouts: workouts.length, entries, aggregatedEntries: aggregated,
      weighIns: profile.weighIns.length, checkins: Object.keys(checkins).length, skippedEntries: skipped,
      rejectedKeys: parsed.rejected
    }
  };
}
