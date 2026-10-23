// Formato dos dados do app novo. Detalhes e motivos: docs/dev/modelo-de-dados.md.
import type { DateKey, WeekStart } from './dates';
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
  /** Série levada até a falha (S5). Conta como série de trabalho normal em volume e recordes. */
  failure?: true;
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
  /** M31: repetições contadas por lado (afundo, remada unilateral); o volume conta os dois lados. */
  perSide?: true;
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
  /** M32: feito numa semana de deload: fica no histórico, mas não vira base da progressão. */
  deload?: true;
}

export interface PlanExercise {
  id: string;
  name: string;
  mode: ExerciseMode;
  sets: number;
  /** Repetições-alvo (modo reps). */
  reps: number;
  /** Faixa de repetições para a progressão dupla (M10). Ausente = só `reps`. */
  repMin?: number;
  repMax?: number;
  /** Quanto a carga sobe na progressão, em kg (M13). Ausente = 2,5. */
  increment?: number;
  /**
   * M31: as repetições são por lado ("8 por lado" no afundo ou na remada unilateral). A faixa e a
   * progressão andam por lado: +1 rep por lado são 2 a mais no total.
   */
  perSide?: boolean;
  weight: number;
  /** Segundos-alvo por série (modo time: prancha, isometria). */
  seconds?: number;
  minutes: number;
  km: number;
  restSeconds?: number;
  /** M17: exercícios seguidos com a mesma marca formam um superset (um descanso só no fim da rodada). */
  superset?: string;
  /** Dica de execução ou substituição mostrada no treino (o "alt" do app antigo). */
  tip?: string;
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
  /** M10: 'linear' sobe a carga a cada treino completo nas reps do plano; ausente = dupla (faixa de reps). */
  progression?: 'double' | 'linear';
  /** Rotação A/B/C (R1, docs/dev/rotacao.md). Ausente = semana fixa. */
  rotation?: PlanRotation;
}

export interface PlanRotation {
  /** Ordem dos treinos (espaços com exercícios). */
  order: DayKey[];
  /** Meta de treinos por semana (XP, semana e sequência). */
  perWeek: number;
  /** "Recomeçar do A": treinos antes deste instante não contam para achar o próximo. */
  restartAt?: string;
}

export type MeasureKey = 'cintura' | 'quadril' | 'peito' | 'braco' | 'coxa' | 'panturrilha' | 'gordura';
export type Measurements = Partial<Record<MeasureKey, number>>;

export type DayNoteReason = 'doente' | 'viajando' | 'lesao' | 'outro';

export interface DayNote {
  reason: DayNoteReason;
  text?: string;
}

/** M19: treino remarcado. Na origem `day` é null (o treino saiu para `to`); no destino, o dia do plano que veio de `from`. */
export interface DayMove {
  planId: string;
  day: DayKey | null;
  from?: DateKey;
  to?: DateKey;
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
  /**
   * Total exibido. Sempre igual a computeTotalXP (base + registros abaixo): guardado só para
   * leitura rápida, recalculado depois de cada ação e de cada sincronização.
   */
  totalXP: number;
  /** XP vindo do app antigo que não dá para atribuir a um registro (bônus sem valor gravado). */
  baseXP: number;
  longestStreak: number;
  checkinXP: Record<DateKey, CheckinXPRecord>;
  /** Bônus concedidos, com o XP de cada um (0 = herdado do app antigo, já contado na base). */
  waterBonus: Record<DateKey, number>;
  streakBonuses: Record<string, number>;
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
  /** Tela ligada durante o treino (M2). Ausente em dados antigos = ligado. */
  keepScreenOn?: boolean;
  /** Ilustrações dos exercícios no treino (Q2). Ausente = ligado. */
  showIllustrations?: boolean;
  /** Tamanho da ilustração no cartão do treino (Q2). Ausente = média. */
  illustrationSize?: 'small' | 'medium' | 'large';
  /** Treino um exercício por vez (N5). Ausente = lista completa. */
  focusMode?: boolean;
  /** Deslizar a série para apagar ou copiar (R2). Ausente = ligado. */
  swipeSets?: boolean;
  /** Botões de ajuste de carga no treino (O20). Ausente = ligado. */
  weightButtons?: boolean;
  /** Backup automático no APK (O11). Ausente = ligado. */
  autoBackup?: boolean;
  /** Calculadora de anilhas (M14): peso da barra e anilhas disponíveis. Ausentes = 20 kg e o jogo comum. */
  barWeight?: number;
  plates?: number[];
  /** Progressão automática de carga (M10–M12). Ausente = ligada. */
  autoProgression?: boolean;
  /** De onde vêm carga e reps ao abrir o treino (M13): sugestão da progressão, última vez ou o plano. Ausente = pela autoProgression. */
  loadSource?: LoadSource;
  /** M40: pedir o peso do dia ao começar o treino (se ainda não pesou hoje). Ausente = desligado. */
  weighBeforeWorkout?: boolean;
  /** M26: exercícios favoritos (nome normalizado): aparecem primeiro na troca e nas buscas. */
  favorites?: string[];
  /** M46: exercícios criados pela pessoa na Biblioteca, com o grupo muscular. */
  customExercises?: CustomExercise[];
  /** M36: equipamentos que a pessoa tem (filtro da troca de exercício). Ausente ou vazio = todos. */
  availableEquipment?: string[];
  /** M19: em que dia a semana começa (faixa da semana, meta semanal, gráficos). Ausente = segunda. */
  weekStart?: WeekStart;
  /** M32: primeiro dia da semana marcada como deload (treinos dela não viram base da progressão). */
  deloadWeek?: DateKey;
  /** M25: cor de destaque (botões, seleção). Ausente = azul. */
  accent?: AccentId;
  /** Tema da interface. Ausente = acompanha o sistema. */
  theme?: ThemePref;
}

export type ThemePref = 'system' | 'light' | 'dark';

/** M46: exercício que não está na biblioteca, criado pela pessoa. */
export interface CustomExercise { name: string; group: string }

export type AccentId = 'azul' | 'roxo' | 'rosa' | 'laranja' | 'ciano';

export type LoadSource = 'auto' | 'last' | 'plan';

/** Fonte efetiva da carga: dados de antes do M13 só tinham a chave da progressão. */
export const weekStartSetting = (settings: Settings): WeekStart => settings.weekStart ?? 'seg';

export function loadSourceOf(settings: Settings): LoadSource {
  return settings.loadSource ?? (settings.autoProgression === false ? 'last' : 'auto');
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
  /** S7: medidas do corpo por data (cm, e % de gordura). Ausente em dados antigos. */
  measurements?: Record<DateKey, Measurements>;
  /** S8: motivo de um dia sem treino; o dia não quebra a sequência. Ausente em dados antigos. */
  dayNotes?: Record<DateKey, DayNote>;
  /** M19: treinos remarcados, por data. Ausente em dados antigos. */
  moves?: Record<DateKey, DayMove>;
  gamification: Gamification;
  settings: Settings;
  /** Carimbos para juntar dados de dois aparelhos (ver sync.ts). */
  sync: SyncStamps;
  meta: {
    lastBackupAt?: string;
    lastSeenVersion?: string;
    hintsSeen: Record<string, true>;
  };
}

/**
 * Chave de cada registro sincronizável: "workout:<id>", "plan:<id>", "weighin:<data>",
 * "checkin:<data>", "water:<data>", "profile", "settings", "activePlan".
 */
export type SyncKey = string;

export interface SyncStamps {
  /** Quando cada registro foi alterado pela última vez (ISO). */
  changed: Record<SyncKey, string>;
  /** Registros apagados e quando, para a exclusão não voltar ao juntar com outro aparelho. */
  deleted: Record<SyncKey, string>;
}

export function emptyGamification(): Gamification {
  return {
    totalXP: 0, baseXP: 0, longestStreak: 0, checkinXP: {}, waterBonus: {}, streakBonuses: {}, freeMealRewards: {},
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
    sync: { changed: {}, deleted: {} }, meta: { hintsSeen: {} }
  };
}

/** Dias obrigatórios com exercícios: substitui o antigo campo manual daysPerWeek (O3). */
export function trainingDaysPerWeek(plan: Plan): number {
  return Object.values(plan.days).filter(d => !d.optional && d.exercises.length > 0).length;
}

const WEEKDAY_TO_DAY_KEY: readonly DayKey[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export function dayKeyOf(date: Date): DayKey {
  return WEEKDAY_TO_DAY_KEY[date.getDay()]!;
}

const sumValues = (record: Record<string, number>) => Object.values(record).reduce((n, v) => n + v, 0);

/** XP total derivado dos registros: o que permite juntar dados de dois aparelhos sem divergir. */
export function computeTotalXP(g: Gamification): number {
  return g.baseXP
    + Object.values(g.checkinXP).reduce((n, r) => n + r.amount, 0)
    + sumValues(g.waterBonus) + sumValues(g.streakBonuses);
}
