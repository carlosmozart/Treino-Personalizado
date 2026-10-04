// Regras do formato do app antigo (≤ 2.x), portadas de js/core/backup-validation.js.
// Servem para ler backups antigos e os dados que o app atual deixou no aparelho.

type Check = (value: unknown) => boolean;
type Obj = Record<string, unknown>;

const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const text: Check = v => typeof v === 'string';
const number: Check = v => typeof v === 'number' && Number.isFinite(v);
// Formulários antigos gravavam números como texto.
const numeric: Check = v => number(v) || (typeof v === 'string' && (v === '' || (v.trim() !== '' && Number.isFinite(Number(v)))));
const bool: Check = v => typeof v === 'boolean';
const list = (check: Check): Check => v => Array.isArray(v) && v.every(check);
const map = (check: Check): Check => v => object(v) && Object.values(v).every(check);
const fields = (v: unknown, schema: Record<string, Check>): boolean =>
  object(v) && Object.entries(schema).every(([key, check]) => !Object.hasOwn(v, key) || check(v[key]));
const isoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const LEGACY_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;
const day: Check = v => (LEGACY_DAYS as readonly unknown[]).includes(v);

const series: Check = v => fields(v, { reps: numeric, weight: numeric, done: bool });
const entry: Check = v => fields(v, {
  name: text, date: text, type: text, obs: text, customName: text,
  sets: numeric, reps: numeric, weight: numeric, duration: numeric, distance: numeric,
  variantIndex: numeric, done: bool, series: list(series)
});
const exercise: Check = v => entry(v) && object(v) && text(v.id) && text(v.name) && fields(v, {
  optional: bool, alt: text, targetSets: numeric, targetReps: numeric, targetWeight: numeric,
  targetDuration: numeric, targetDistance: numeric, restSeconds: numeric,
  backups: list(b => object(b) && text(b.name) && fields(b, { type: text }))
});
const plan: Check = v => fields(v, {
  id: text, name: text, description: text, daysPerWeek: numeric, trainingTime: text, createdAt: text, updatedAt: text
}) && object(v) && object(v.schedule) && LEGACY_DAYS.every(key => {
  const workout = (v.schedule as Obj)[key];
  return fields(workout, { focus: text, optional: bool }) && object(workout) && text(workout.name) && list(exercise)(workout.exercises);
});
const goal: Check = g => object(g) && number(g.startWeight) && (g.startWeight as number) > 0
  && number(g.targetWeight) && (g.targetWeight as number) > 0 && isoDate(g.startedAt)
  && fields(g, {
    checkpoints: dates => object(dates) && Object.entries(dates).every(([key, date]) =>
      ['25', '50', '75', '100'].includes(key) && isoDate(date) && date >= (g.startedAt as string))
  });

const SCHEMAS: Record<string, Check> = {
  treino_user_profile: v => fields(v, {
    name: text, birthdate: text, sex: text, activityLevel: text, tmbFormula: text,
    age: numeric, height: numeric, weight: numeric, targetWeight: numeric, bodyFatPercent: numeric,
    weightGoal: goal,
    weightHistory: list(row => object(row) && text(row.date) && numeric(row.weight) && fields(row, { imc: numeric }))
  }),
  treino_profiles: map(plan),
  treino_session_log: map(list(entry)),
  treino_exercise_history: map(entry),
  treino_water_log: map(numeric),
  treino_checkins: map(v => day(v) || bool(v)),
  treino_daily_completion: map(map(bool)),
  treino_hints_seen: map(bool),
  treino_settings: v => fields(v, {
    restSeconds: numeric, restAutoStart: bool, restSound: bool, restVibrate: bool,
    trainingReminders: bool, restBackgroundNotification: bool, restBackgroundHintShown: bool
  }),
  treino_workout_meta: map(v => fields(v, { inicio: text, fim: text, minutos: numeric })),
  treino_workout_draft: v => fields(v, { date: text, profileId: text, workoutKey: day, formData: map(entry) }),
  treino_gamification: v => fields(v, {
    totalXP: number, longestStreak: number, bigWeightJump: bool,
    checkins: map(row => fields(row, { amount: number, full: bool })),
    waterBonus: map(bool), streakBonuses: map(bool), freeMealRewards: map(bool),
    unlockedAchievements: map(text), birthdayGreeted: map(bool), nightCheckins: map(bool), equippedProfiles: map(bool)
  })
};

/** Chaves que o app antigo exporta no backup (as de texto simples ficam fora de SCHEMAS). */
export const LEGACY_KEYS = [
  'treino_exercise_history', 'treino_checkins', 'treino_gamification', 'treino_user_profile',
  'treino_water_log', 'treino_daily_completion', 'treino_hints_seen', 'treino_profiles',
  'treino_active_profile_id', 'treino_last_seen_version', 'treino_session_log',
  'treino_settings', 'treino_workout_draft', 'treino_last_backup_at',
  'treino_last_backup_nag', 'treino_optional_migrated', 'treino_workout_meta', 'treino_log_sanitized'
] as const;
export type LegacyKey = (typeof LEGACY_KEYS)[number];

/** Recusa propriedades perigosas em qualquer profundidade. */
export function safeTree(value: unknown, depth = 0): boolean {
  if (depth > 30) return false;
  if (!value || typeof value !== 'object') return true;
  return Object.entries(value).every(([key, child]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) && safeTree(child, depth + 1));
}

export interface LegacyParseResult {
  /** Valores já convertidos de JSON (ou texto puro, para as chaves simples), só os válidos. */
  values: Partial<Record<LegacyKey, unknown>>;
  /** Chaves ignoradas e o motivo. */
  rejected: { key: string; reason: string }[];
}

/**
 * Lê o mapa chave → texto do app antigo. Diferente do validador antigo (tudo ou nada, para não
 * restaurar um arquivo corrompido por cima do progresso), aqui cada chave é avaliada sozinha:
 * na migração do próprio aparelho, uma chave estragada não pode impedir as outras de virem.
 * Quem importa um arquivo decide pelo relatório se aceita.
 */
export function parseLegacyData(raw: Record<string, unknown>): LegacyParseResult {
  const values: LegacyParseResult['values'] = {};
  const rejected: LegacyParseResult['rejected'] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!(LEGACY_KEYS as readonly string[]).includes(key)) { rejected.push({ key, reason: 'chave desconhecida' }); continue; }
    if (typeof value !== 'string') { rejected.push({ key, reason: 'valor não é texto' }); continue; }
    const schema = SCHEMAS[key];
    if (!schema) { values[key as LegacyKey] = value; continue; }
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { rejected.push({ key, reason: 'JSON inválido' }); continue; }
    if (!object(parsed) || !safeTree(parsed)) { rejected.push({ key, reason: 'estrutura inválida' }); continue; }
    if (!schema(parsed)) { rejected.push({ key, reason: 'formato não reconhecido' }); continue; }
    values[key as LegacyKey] = parsed;
  }
  return { values, rejected };
}

/** Envelope do backup v1 exportado pelo app antigo. */
export function isLegacyBackupEnvelope(value: unknown): value is { app: 'treino-personalizado'; backupVersion: 1; data: Record<string, unknown> } {
  return fields(value, { exportedAt: text, appVersion: text }) && object(value)
    && value.app === 'treino-personalizado' && value.backupVersion === 1 && object(value.data);
}
