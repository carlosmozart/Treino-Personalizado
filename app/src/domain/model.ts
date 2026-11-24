// Formato dos dados do app novo. Detalhes e motivos: docs/dev/modelo-de-dados.md.
import type { DateKey, WeekStart } from './dates';
import type { DayKey } from './ai-plan';
import type { ActivityLevel, Sex, TmbFormulaId } from './health';
import type { WeightGoal } from './body-goal';
import type { CheckinXPRecord } from './gamification';
import type { SeasonalPref } from './seasonal';
import type { RotationSlot } from './rotation';
import type { RpgState } from './rpg';

export const SCHEMA_VERSION = 1;

export type ExerciseMode = 'reps' | 'time' | 'cardio';
export type SetKind = 'work' | 'warmup';

export interface WorkoutSet {
  reps: number;
  weight: number;
  kind: SetKind;
  /** Série levada até a falha (S5). Conta como série de trabalho normal em volume e recordes. */
  failure?: true;
  /** V2: nota curta da série ("pegada escorregou", "senti o ombro"). */
  note?: string;
  /** V14: hora em que a série foi marcada (ISO). Ausente em séries antigas. */
  at?: string;
}

export interface WorkoutEntry {
  /** Identidade do exercício: nome normalizado (ver normalizeExerciseName). */
  key: string;
  name: string;
  mode: ExerciseMode;
  /** Só séries feitas. Vazio em cardio. */
  sets: WorkoutSet[];
  /** W19: `level` = nível de resistência (bicicleta, remo, elíptico), de 1 a 30. */
  cardio?: { minutes: number; km?: number; level?: number };
  note?: string;
  /** Veio do formato antigo "3x10 · 40kg": as séries são uma reconstrução uniforme. */
  aggregated?: true;
  /** M31: repetições contadas por lado (afundo, remada unilateral); o volume conta os dois lados. */
  perSide?: true;
  /** T13: acrescentado durante um treino do plano (não estava no dia): o resumo oferece levar ao plano. */
  added?: true;
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
  /** W2: treino feito mais leve depois de um check-in ruim; também fica fora da progressão. */
  light?: LightKind;
  /** W2: check-in do dia, respondido ao começar o treino. */
  form?: DailyForm;
  /** W13: exercícios do plano que ficaram sem nenhuma série feita (para oferecer no próximo). */
  skipped?: string[];
  /** W4: salvo sozinho, depois de ficar esquecido aberto (dá para reabrir). */
  autoFinished?: true;
}

/** W2: como o treino ficou mais leve: carga 10% menor ou uma série a menos por exercício. */
export type LightKind = 'carga' | 'series';

/**
 * W2: check-in do dia, de 1 a 5, tudo opcional. Sono e energia: 5 é ótimo. Dor muscular e
 * estresse: 5 é muito (ruim).
 */
export interface DailyForm { sono?: number; energia?: number; dor?: number; estresse?: number }

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
  /** T6: descanso curto entre os lados (exercício por lado), em segundos. Ausente ou 0 = sem. */
  sideRestSeconds?: number;
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
  /** Carga travada: o treino abre com esta carga e a progressão não a muda. */
  lockWeight?: true | undefined;
  /** Séries de aquecimento com que o exercício começa (metade da carga, 10 reps). */
  warmupSets?: number | undefined;
  /** T23: os pesos que a pilha da máquina tem (kg, em ordem); a carga anda de pino em pino. */
  stack?: number[] | undefined;
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
  /** Volta: espaços com exercícios, que podem se repetir, e dias de descanso (T14). */
  order: RotationSlot[];
  /** Meta de treinos por semana (XP, semana e sequência). */
  perWeek: number;
  /** "Recomeçar do A": treinos antes deste instante não contam para achar o próximo. */
  restartAt?: string;
}

export type MeasureKey = 'cintura' | 'quadril' | 'peito' | 'braco' | 'coxa' | 'panturrilha' | 'gordura';
export type Measurements = Partial<Record<MeasureKey, number>>;

export type DayNoteReason = 'doente' | 'viajando' | 'lesao' | 'outro';

/** W10: atividade ou recuperação fora da musculação. */
export type ActivityKind = 'corrida' | 'caminhada' | 'bicicleta' | 'futebol' | 'padel' | 'natacao' | 'luta' | 'danca'
  | 'alongamento' | 'yoga' | 'sauna' | 'massagem' | 'outra';

export interface Activity {
  id: string;
  date: DateKey;
  kind: ActivityKind;
  minutes: number;
  /** Nome livre (em "Outra") ou uma observação curta. */
  note?: string;
}

/**
 * Z1: protocolo de hormônios, peptídeos ou medicamentos. Seção opcional, só de registro: o app
 * guarda o que a pessoa informa e nunca sugere substância nem dose.
 */
export type ProtocolKind = 'ciclo' | 'trt' | 'emagrecimento' | 'tratamento' | 'outro';
export type SubstanceCategory = 'hormonio' | 'peptideo' | 'medicamento' | 'suplemento';
export type DoseRoute = 'im' | 'sc' | 'oral' | 'topico' | 'outra';
export type DoseUnit = 'mg' | 'mcg' | 'UI' | 'ml' | 'comprimido' | 'gota';
/** A cada N dias (contando do primeiro dia da substância) ou em dias fixos da semana. */
export type DoseSchedule = { every: number } | { weekdays: DayKey[] };

export interface ProtocolItem {
  id: string;
  name: string;
  category: SubstanceCategory;
  route: DoseRoute;
  dose: number;
  unit: DoseUnit;
  schedule: DoseSchedule;
  /** Semana do protocolo em que começa e em que termina (1 = a primeira). Ausentes = o protocolo todo. */
  fromWeek?: number;
  toWeek?: number;
  /** Z2: meia-vida informada pela pessoa (horas), só para desenhar a curva estimada. */
  halfLifeHours?: number;
  /** Z3: quantas doses no dia previsto (1 a 6). Ausente = 1. */
  timesPerDay?: number;
  /** Z4: horário de cada dose do dia ("08:00"; vazio = sem horário), para o lembrete e a curva. */
  times?: string[];
  /** Z3: concentração do frasco, na unidade da dose por ml (mg/ml, mcg/ml, UI/ml), do rótulo ou da diluição. */
  perMl?: number;
  note?: string;
}

export interface Protocol {
  id: string;
  name: string;
  kind: ProtocolKind;
  startDate: DateKey;
  /** Duração planejada em semanas. Ausente = contínuo (reposição, tratamento). */
  weeks?: number;
  /** Encerrado antes (ou depois) do previsto, neste dia. */
  endedOn?: DateKey;
  items: ProtocolItem[];
  note?: string;
}

/** Locais de aplicação, para alternar (e lembrar onde foi a última). */
export type InjectionSite = 'gluteo-e' | 'gluteo-d' | 'coxa-e' | 'coxa-d' | 'deltoide-e' | 'deltoide-d' | 'abdome-e' | 'abdome-d' | 'outro';

export interface DoseLog {
  id: string;
  date: DateKey;
  /** Hora em que foi registrada (ISO). */
  at: string;
  name: string;
  dose: number;
  unit: DoseUnit;
  route: DoseRoute;
  /** De qual item de qual protocolo veio; ausentes numa dose avulsa. */
  protocolId?: string;
  itemId?: string;
  site?: InjectionSite;
  note?: string;
  /** Z3: qual das doses do dia (0 = a primeira), quando a substância tem mais de uma. Ausente = 0. */
  slot?: number;
}

export type HealthEntryKind = 'sintomas' | 'pressao' | 'exame' | 'nota';

/** Z1: diário de saúde do protocolo: sintomas, pressão, exames de sangue e notas. */
export interface HealthEntry {
  id: string;
  date: DateKey;
  kind: HealthEntryKind;
  symptoms?: string[];
  text?: string;
  pressure?: { sys: number; dia: number; pulse?: number };
  exam?: { name: string; value: number; unit: string }[];
}

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
  /** V7: XP dos desafios do mês cumpridos, por "2026-11:treinos". Ausente em dados antigos. */
  challengeBonus?: Record<string, number>;
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
  /** M21: contagem do descanso na barra de notificações do APK, com −15s, +15s e Pular. Ausente = ligada. */
  restCountdown?: boolean;
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
  /**
   * T6: descanso depois de uma série de aquecimento, em segundos; 0 = sem cronômetro. Ausente = o
   * mesmo descanso das outras séries.
   */
  warmupRest?: number | undefined;
  /** V8: rampa de aquecimento automática nos compostos. Ausente = desligada. */
  autoWarmup?: boolean;
  /** T22: aquecimento conta no volume (recordes e progressão continuam sem ele). Ausente = não. */
  volumeWarmup?: boolean;
  /** V13: peso do corpo no volume de barra fixa e paralelas. Ausente = não. */
  volumeBodyweight?: boolean;
  /** W2: check-in do dia (sono, energia, dor, estresse) ao começar o treino. Ausente = desligado. */
  dailyForm?: boolean;
  /** W4: minutos sem marcar nada até perguntar "Ainda treinando?"; 0 = nunca. Ausente = 45. */
  forgottenMinutes?: number;
  /** W11: abrir o treino numa prévia, com "Começar" embaixo. Ausente = desligado. */
  previewBeforeStart?: boolean;
  /** W12: no fim do descanso depois da última série, ir ao próximo exercício. Ausente = desligado. */
  autoNextExercise?: boolean;
  /** W13: oferecer os exercícios que ficaram para trás no treino anterior. Ausente = ligado. */
  offerLeftovers?: boolean;
  /** W8: troféu na série que bate um recorde. Ausente = ligado. */
  recordTrophies?: boolean;
  /** W8: linha "faltam 2 repetições para o recorde" antes da próxima série. Ausente = ligada. */
  recordHints?: boolean;
  /** W18: menos movimento neste aparelho (sem animações, neve nem enfeites que se mexem). Ausente = desligado. */
  reduceMotion?: boolean;
  /** W17: tamanho do texto ('menor', 'padrao', 'maior', 'grande'). Ausente = padrão. */
  textScale?: 'menor' | 'padrao' | 'maior' | 'grande';
  /** W10: dia com atividade registrada não quebra a sequência. Ausente = desligado. */
  activitiesKeepStreak?: boolean;
  /** Z1: seção de protocolo (hormônios, peptídeos, medicamentos). Ausente = desligada e escondida. */
  protocolEnabled?: boolean;
  /** Z4: aviso na hora de cada dose com horário. Ausente = desligado. */
  doseReminders?: boolean;
  /** Z5: refazer os exames de sangue a cada N semanas (lembrete). Ausente ou 0 = sem lembrete. */
  examEveryWeeks?: number;
  /** Z4: o aviso mostra o nome e a dose (senão, só "Hora de registrar sua dose"). Ausente = não. */
  doseReminderDetails?: boolean;
  /** W14: séries e repetições com que um exercício novo começa. Ausentes = 3 e 10. */
  newExerciseSets?: number;
  newExerciseReps?: number;
  /** T16: outros nomes de cada exercício (chave: nome normalizado), usados na busca. */
  aliases?: Record<string, string[]>;
  /** W9: sugerir semana de deload a cada N semanas (0 ou ausente = só quando os números caem). */
  deloadEvery?: number;
  /** W9: sugerir deload quando as cargas caem ou o check-in anda ruim. Ausente = ligado. */
  deloadSuggest?: boolean;
  /** V17: prancha e isometrias começam sozinhas (3, 2, 1) quando o descanso delas acaba. Ausente = ligado. */
  autoHold?: boolean;
  /** M19: em que dia a semana começa (faixa da semana, meta semanal, gráficos). Ausente = segunda. */
  weekStart?: WeekStart;
  /** M32: primeiro dia da semana marcada como deload (treinos dela não viram base da progressão). */
  deloadWeek?: DateKey;
  /** M25: cor de destaque (botões, seleção). Ausente = azul. */
  accent?: AccentId;
  /** Tema da interface. Ausente = acompanha o sistema. */
  theme?: ThemePref;
  /** V1: seta em cada série contra a mesma série da última vez. Ausente = ligada. */
  compareSets?: boolean;
  /** V3: faixa de séries por semana de cada grupo, quando diferente da padrão. */
  weeklySetTargets?: Record<string, { min: number; max: number }>;
  /** V3: linha no Início com o grupo que mais tem espaço na semana. Ausente = desligada. */
  weeklySetsOnHome?: boolean;
  /** V4: resumo da semana e do mês no Início. Ausente = ligado. */
  recaps?: boolean;
  /** Temas de época (Halloween): automático na época, sempre ou desligado. Ausente = automático. */
  seasonalTheme?: SeasonalPref;
  /** Cores de abóbora enquanto o tema de época vale. Ausente = sim. */
  seasonalColors?: boolean;
  /** Versão calma do tema de época durante o treino. Ausente = sim. */
  seasonalInWorkout?: boolean;
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
  /** W10: atividades e recuperação, por id. Ausente quando não há nenhuma. */
  activities?: Record<string, Activity>;
  /** Z1: protocolos, doses registradas e diário de saúde, por id. Ausentes quando vazios. */
  protocols?: Record<string, Protocol>;
  doses?: Record<string, DoseLog>;
  healthLog?: Record<string, HealthEntry>;
  /** M19: treinos remarcados, por data. Ausente em dados antigos. */
  moves?: Record<DateKey, DayMove>;
  gamification: Gamification;
  /** Modo RPG: escolhas da pessoa (o resto é calculado do histórico). Ausente = nunca ligado. */
  rpg?: RpgState;
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
 * "checkin:<data>", "water:<data>", "profile", "settings", "activePlan", "rpg".
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
    + sumValues(g.waterBonus) + sumValues(g.streakBonuses) + sumValues(g.challengeBonus ?? {});
}
