// Formato dos dados do app novo. Detalhes e motivos: docs/dev/modelo-de-dados.md.
import type { DateKey } from './dates';
import type { DayKey } from './ai-plan';
import type { ActivityLevel, Sex, TmbFormulaId } from './health';
import type { WeightGoal } from './body-goal';
import type { CheckinXPRecord } from './gamification';

export const SCHEMA_VERSION = 1;

export type ExerciseMode = 'reps' | 'time' | 'cardio';
export type SetKind = 'work' | 'warmup';

export interface WorkoutSet {
  reps: number;
  weight: number;
  kind: SetKind;
}

export interface WorkoutEntry {
  /** Identidade do exercício: nome normalizado (ver normalizeExerciseName). */
  key: string;
  name: string;
  mode: ExerciseMode;
  /** Só séries feitas. Vazio em cardio. */
  sets: WorkoutSet[];
  cardio?: { minutes: number; km?: number };
  note?: string;
  /** Veio do formato antigo "3x10 · 40kg": as séries são uma reconstrução uniforme. */
  aggregated?: true;
}

export interface Workout {
  id: string;
  date: DateKey;
  startedAt?: string;
  endedAt?: string;
  durationMin?: number;
  planId?: string;
  dayKey?: DayKey;
  dayName?: string;
  source: 'app' | 'migrated';
  entries: WorkoutEntry[];
}

export interface PlanExercise {
  id: string;
  name: string;
  mode: ExerciseMode;
  sets: number;
  /** Repetições-alvo (modo reps). */
  reps: number;
  weight: number;
  /** Segundos-alvo por série (modo time: prancha, isometria). */
  seconds?: number;
  minutes: number;
  km: number;
  restSeconds?: number;
  optional: boolean;
  alternatives: { name: string; mode: ExerciseMode }[];
}

export interface PlanDay {
  name: string;
  focus: string;
  optional: boolean;
  exercises: PlanExercise[];
}

export const MAX_EXERCISES_PER_DAY = 10;

export const DAY_FULL_NAMES: Record<DayKey, string> = {
  SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado', DOM: 'Domingo'
};

export interface Plan {
  id: string;
  name: string;
  description: string;
  trainingTime: string;
  createdAt: DateKey;
  updatedAt: DateKey;
  days: Record<DayKey, PlanDay>;
}

export interface WeighIn {
  date: DateKey;
  weight: number;
}

export interface UserProfile {
  name: string;
  birthdate: string;
  sex: Sex;
  activityLevel: ActivityLevel;
  tmbFormula: TmbFormulaId;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  bodyFatPercent: number | null;
  weightGoal?: WeightGoal;
  weighIns: WeighIn[];
}

export interface Gamification {
  totalXP: number;
  longestStreak: number;
  checkinXP: Record<DateKey, CheckinXPRecord>;
  waterBonus: Record<DateKey, true>;
  streakBonuses: Record<string, true>;
  freeMealRewards: Record<DateKey, true>;
  /** Conquista → data em que foi desbloqueada. */
  achievements: Record<string, string>;
  birthdayGreeted: Record<string, true>;
  nightCheckins: Record<DateKey, true>;
  activatedPlans: Record<string, true>;
  bigWeightJump: boolean;
}

export interface Settings {
  restSeconds: number;
  restAutoStart: boolean;
  restSound: boolean;
  restVibrate: boolean;
  trainingReminders: boolean;
  restBackgroundNotification: boolean;
  restBackgroundHintShown: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  restSeconds: 90,
  restAutoStart: true,
  restSound: true,
  restVibrate: true,
  trainingReminders: false,
  restBackgroundNotification: false,
  restBackgroundHintShown: false
};

export interface AppData {
  schemaVersion: typeof SCHEMA_VERSION;
  profile: UserProfile;
  plans: Record<string, Plan>;
  activePlanId: string | null;
  /** Ordenados por data (e início, quando houver). */
  workouts: Workout[];
  checkins: Record<DateKey, { dayKey: DayKey | null }>;
  water: Record<DateKey, number>;
  gamification: Gamification;
  settings: Settings;
  meta: {
    lastBackupAt?: string;
    lastSeenVersion?: string;
    hintsSeen: Record<string, true>;
  };
}

export function emptyGamification(): Gamification {
  return {
    totalXP: 0, longestStreak: 0, checkinXP: {}, waterBonus: {}, streakBonuses: {}, freeMealRewards: {},
    achievements: {}, birthdayGreeted: {}, nightCheckins: {}, activatedPlans: {}, bigWeightJump: false
  };
}

export function emptyProfile(): UserProfile {
  return {
    name: '', birthdate: '', sex: '', activityLevel: 'moderado', tmbFormula: 'mifflin',
    heightCm: null, weightKg: null, targetWeightKg: null, bodyFatPercent: null, weighIns: []
  };
}

export function emptyAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION, profile: emptyProfile(), plans: {}, activePlanId: null, workouts: [],
    checkins: {}, water: {}, gamification: emptyGamification(), settings: { ...DEFAULT_SETTINGS },
    meta: { hintsSeen: {} }
  };
}

/** Dias obrigatórios com exercícios: substitui o antigo campo manual daysPerWeek (O3). */
export function trainingDaysPerWeek(plan: Plan): number {
  return Object.values(plan.days).filter(d => !d.optional && d.exercises.length > 0).length;
}
