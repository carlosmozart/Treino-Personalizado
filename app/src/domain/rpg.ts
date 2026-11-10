// Modo RPG (R0/R1): classe, nível de classe, missões e atributos, todos calculados do histórico de
// treinos, como o XP. Só ficam gravados as escolhas da pessoa (tema, classes, pontos de bônus).
// Ligar e desligar nunca perde progresso; juntar dois aparelhos não diverge.
//
// Fluxo do XP de classe: cada dia de treino e cada semana com a meta cumprida geram XP. O XP enche
// a etapa atual (Aprendiz até o nível 10, 1ª e 2ª classe até o 50); o que passa do teto fica
// guardado e entra na próxima classe quando ela for escolhida, já com a afinidade dela.
// Para não premiar excesso: só um treino por dia conta e no máximo 6 dias por semana.
import { FIRST_CLASSES, RPG_CLASS_BY_ID, STATS, secondClassesOf, type ClassTier, type PathId, type RpgClass, type RpgTheme, type StatId } from '../data/rpg-classes';
import type { ActionResult } from './actions';
import { addDays, toDateKey, weekStartOf, type DateKey } from './dates';
import { levelInfo } from './gamification';
import { weekStartSetting, type AppData, type Workout } from './model';
import { daysPerWeekOf } from './rewards';
import { bestE1rm } from './strength';
import { key, touch } from './sync';
import { bestSet, workSets, workoutVolume } from './workouts';

export interface RpgPathStep { classId: string; at: string }

export interface RpgState {
  enabled: boolean;
  theme: RpgTheme;
  /** Classes escolhidas, em ordem: a 1ª e depois a 2ª. O Aprendiz é implícito. */
  path: RpgPathStep[];
  /** Pontos de bônus distribuídos à mão (ganhos com o nível de base). */
  points: Partial<Record<StatId, number>>;
  /** Último nível de classe já comemorado, para a animação de level up aparecer uma vez. */
  celebrated?: { classId: string; level: number };
}

export const emptyRpg = (): RpgState => ({ enabled: false, theme: 'classico', path: [], points: {} });
export const rpgOf = (data: AppData): RpgState => data.rpg ?? emptyRpg();

/**
 * Chave "liberado para esta conta": se o modo virar premium, a decisão entra aqui (login e
 * cobrança, P10/R4) sem reestruturar o resto. Hoje está liberado para todos.
 */
export function rpgUnlocked(_data: AppData): boolean {
  return true;
}

// ---------- níveis de classe ----------

export const CLASS_CAP: Record<ClassTier, number> = { 0: 10, 1: 50, 2: 50 };

/** XP para sair de `level` para o seguinte, por etapa. Ritmo pensado para 3 treinos por semana. */
export function classXpForLevel(tier: ClassTier, level: number): number {
  if (tier === 0) return 100;
  if (tier === 1) return 60 + 3 * level;
  return 150 + 6 * level;
}

/** XP total para chegar ao teto da etapa. */
export function stageNeed(tier: ClassTier): number {
  let total = 0;
  for (let l = 1; l < CLASS_CAP[tier]; l++) total += classXpForLevel(tier, l);
  return total;
}

export interface ClassLevel { level: number; xpIntoLevel: number; xpToNext: number; capped: boolean }

export function classLevel(tier: ClassTier, xp: number): ClassLevel {
  const cap = CLASS_CAP[tier];
  let level = 1;
  let left = Math.floor(xp);
  while (level < cap && left >= classXpForLevel(tier, level)) left -= classXpForLevel(tier, level++);
  return level >= cap ? { level: cap, xpIntoLevel: 0, xpToNext: 0, capped: true } : { level, xpIntoLevel: left, xpToNext: classXpForLevel(tier, level), capped: false };
}

// ---------- fatos do histórico ----------

export const DAY_XP = 100;
/** Afinidade cheia vale +50% no dia. */
export const AFFINITY_BONUS = 0.5;
export const WEEK_XP = 100;
/** Constância (Noviço e as 2ªs dele) ganha a semana cumprida em dobro, em vez de afinidade diária. */
export const CONSTANCY_WEEK_MULT = 2;
export const MAX_XP_DAYS_PER_WEEK = 6;
/** Série pesada: até 8 repetições, com carga. */
export const HEAVY_REPS = 8;
export const SHORT_WORKOUT_MIN = 45;
export const DENSE_MIN_SETS = 8;

type Affinity = Record<PathId, number>;
const zeroAffinity = (): Affinity => ({ forca: 0, cardio: 0, intensidade: 0, constancia: 0, metodo: 0, volume: 0 });

interface WorkoutFacts {
  date: DateKey;
  affinity: Affinity;
  heavySets: number;
  workSets: number;
  e1rmRecords: number;
  loadUps: number;
  cardioMin: number;
  dense: boolean;
  fromPlan: boolean;
  volume: number;
}

function durationOf(w: Workout): number | null {
  if (typeof w.durationMin === 'number' && w.durationMin > 0) return w.durationMin;
  if (w.startedAt && w.endedAt) {
    const min = (Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60_000;
    return Number.isFinite(min) && min > 0 ? min : null;
  }
  return null;
}

/** Fatos de cada treino numa passada só, em ordem de data (recordes contra datas anteriores). */
function workoutFacts(workouts: readonly Workout[]): WorkoutFacts[] {
  const sorted = [...workouts].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.startedAt ?? '').localeCompare(b.startedAt ?? '')));
  const bestByKey = new Map<string, number>();
  const lastBest = new Map<string, { weight: number; reps: number }>();
  const out: WorkoutFacts[] = [];
  let pending: { e1rm: [string, number][]; best: [string, { weight: number; reps: number }][] } = { e1rm: [], best: [] };
  let currentDate = '';
  const flush = () => {
    for (const [k, v] of pending.e1rm) bestByKey.set(k, Math.max(bestByKey.get(k) ?? 0, v));
    for (const [k, v] of pending.best) lastBest.set(k, v);
    pending = { e1rm: [], best: [] };
  };
  for (const w of sorted) {
    if (w.date !== currentDate) { flush(); currentDate = w.date; }
    let heavy = 0, sets = 0, records = 0, ups = 0, cardio = 0;
    for (const e of w.entries) {
      if (e.mode === 'cardio') { cardio += e.cardio?.minutes ?? 0; continue; }
      const ws = workSets(e);
      sets += ws.length;
      if (e.mode === 'reps') heavy += ws.filter(s => s.weight > 0 && s.reps >= 1 && s.reps <= HEAVY_REPS).length;
      const cur = bestE1rm(e)?.value ?? 0;
      const prev = bestByKey.get(e.key) ?? 0;
      if (cur > prev && prev > 0) records++;
      if (cur > 0) pending.e1rm.push([e.key, cur]);
      const b = bestSet(e);
      const before = lastBest.get(e.key);
      if (b && before && (b.weight > before.weight || (b.weight === before.weight && b.reps > before.reps))) ups++;
      if (b) pending.best.push([e.key, { weight: b.weight, reps: b.reps }]);
    }
    const duration = durationOf(w);
    const dense = duration !== null && duration <= SHORT_WORKOUT_MIN && sets >= DENSE_MIN_SETS;
    const volume = workoutVolume(w);
    const fromPlan = !!w.planId;
    const affinity: Affinity = {
      forca: records > 0 ? 1 : Math.min(1, (heavy / Math.max(1, sets)) * 1.5),
      cardio: Math.min(1, cardio / 30),
      intensidade: dense ? 1 : duration !== null && duration <= 60 && sets >= DENSE_MIN_SETS ? 0.5 : 0,
      constancia: 0,
      metodo: (fromPlan ? 0.5 : 0) + (ups > 0 ? 0.5 : 0),
      volume: Math.min(1, volume / 6000)
    };
    out.push({ date: w.date, affinity, heavySets: heavy, workSets: sets, e1rmRecords: records, loadUps: ups, cardioMin: cardio, dense, fromPlan, volume });
  }
  return out;
}

interface WeekFacts { start: DateKey; days: number; good: boolean; allFromPlan: boolean; reachedOn: DateKey | null }

type XpEvent = { date: DateKey; kind: 'day'; affinity: Affinity } | { date: DateKey; kind: 'week' };

interface History {
  facts: WorkoutFacts[];
  weeks: Map<DateKey, WeekFacts>;
  events: XpEvent[];
  target: number;
}

function buildHistory(data: AppData): History {
  const facts = workoutFacts(data.workouts);
  const start = weekStartSetting(data.settings);
  const target = Math.min(MAX_XP_DAYS_PER_WEEK, Math.max(1, daysPerWeekOf(data)));
  const byDay = new Map<DateKey, WorkoutFacts[]>();
  for (const f of facts) byDay.set(f.date, [...(byDay.get(f.date) ?? []), f]);
  const weeks = new Map<DateKey, WeekFacts>();
  const events: XpEvent[] = [];
  for (const [date, list] of [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const wk = weekStartOf(date, start);
    const week = weeks.get(wk) ?? { start: wk, days: 0, good: false, allFromPlan: true, reachedOn: null };
    weeks.set(wk, week);
    week.allFromPlan &&= list.every(f => f.fromPlan);
    if (week.days >= MAX_XP_DAYS_PER_WEEK) continue;
    week.days++;
    const affinity = zeroAffinity();
    for (const f of list) for (const p of Object.keys(affinity) as PathId[]) affinity[p] = Math.max(affinity[p], f.affinity[p]);
    events.push({ date, kind: 'day', affinity });
    if (!week.good && week.days >= target) {
      week.good = true;
      week.reachedOn = date;
      events.push({ date, kind: 'week' });
    }
  }
  return { facts, weeks, events, target };
}

function eventXp(ev: XpEvent, path: PathId | undefined): number {
  if (ev.kind === 'week') return WEEK_XP * (path === 'constancia' ? CONSTANCY_WEEK_MULT : 1);
  return DAY_XP * (1 + AFFINITY_BONUS * (path ? ev.affinity[path] : 0));
}

// ---------- missões de troca de classe ----------

export interface MissionView { label: string; progress: number; goal: number; unit: string; done: boolean }

/** Semanas seguidas (a mais longa) que cumprem `ok`, a partir de `from`. A semana corrente só soma. */
function bestWeekRun(h: History, from: DateKey, today: DateKey, startSetting: AppData['settings'], ok: (w: WeekFacts) => boolean): number {
  const s = weekStartSetting(startSetting);
  const last = weekStartOf(today, s);
  let best = 0, run = 0;
  for (let wk = weekStartOf(from, s); wk <= last; wk = addDays(wk, 7)) {
    const w = h.weeks.get(wk);
    if (w && ok(w)) best = Math.max(best, ++run);
    else if (wk !== last) run = 0;
  }
  return best;
}

function missionFor(cls: RpgClass, h: History, from: DateKey | null, data: AppData, today: DateKey): MissionView | undefined {
  if (cls.tier !== 1) return undefined;
  const win = from ? h.facts.filter(f => f.date >= from) : [];
  const sum = (fn: (f: WorkoutFacts) => number) => win.reduce((n, f) => n + fn(f), 0);
  const runs = (ok: (w: WeekFacts) => boolean) => (from ? bestWeekRun(h, from, today, data.settings, ok) : 0);
  const m = (label: string, progress: number, goal: number, unit: string): MissionView =>
    ({ label, progress: Math.min(goal, Math.floor(progress)), goal, unit, done: progress >= goal });
  switch (cls.path) {
    case 'forca': return m('Bater 10 recordes de 1RM estimado', sum(f => f.e1rmRecords), 10, 'recordes');
    case 'cardio': return m('Somar 300 minutos de cardio', sum(f => f.cardioMin), 300, 'min');
    case 'intensidade': return m(`Fazer 10 treinos de até ${SHORT_WORKOUT_MIN} minutos, com ${DENSE_MIN_SETS} séries ou mais`, sum(f => (f.dense ? 1 : 0)), 10, 'treinos');
    case 'constancia': return m('Cumprir a meta da semana por 4 semanas seguidas', runs(w => w.good), 4, 'semanas');
    case 'metodo': return m('Seguir o plano por 3 semanas seguidas, cumprindo a meta', runs(w => w.good && w.allFromPlan), 3, 'semanas');
    case 'volume': return m('Levantar 100 toneladas somadas', sum(f => f.volume) / 1000, 100, 't');
    default: return undefined;
  }
}

// ---------- visão completa ----------

export interface StageView {
  cls: RpgClass;
  xp: number;
  level: ClassLevel;
  /** Primeiro dia que rendeu XP nesta etapa (as missões contam a partir dele). */
  startedOn: DateKey | null;
  mission?: MissionView;
}

export interface ClassOption {
  cls: RpgClass;
  /** Afinidade média do histórico guardado com a classe (0 a 1). */
  affinity: number;
  /** Nível em que a classe começaria com o XP guardado. */
  startLevel: number;
}

export interface StatView { id: StatId; base: number; bonus: number; total: number }

export interface RpgView {
  state: RpgState;
  theme: RpgTheme;
  sex: 'm' | 'f';
  baseLevel: number;
  stages: StageView[];
  current: StageView;
  /** XP guardado para a próxima classe (sem afinidade) ou para o futuro renascimento. */
  banked: number;
  /** Classes que já dá para escolher agora, ordenadas pela afinidade do histórico. */
  options: ClassOption[];
  /** O que falta para liberar a próxima escolha; null quando não há próxima etapa ou já liberou. */
  nextHint: string | null;
  stats: StatView[];
  points: { earned: number; spent: number; free: number };
  history: { target: number; trainingDays: number; goodWeeks: number };
}

export const STAT_MAX = 99;
/** Um ponto de bônus a cada 2 níveis de base. */
export const pointsForBaseLevel = (level: number) => Math.max(0, Math.floor((level - 1) / 2));

function computeStats(h: History, data: AppData, bonus: RpgState['points']): StatView[] {
  const total = (fn: (f: WorkoutFacts) => number) => h.facts.reduce((n, f) => n + fn(f), 0);
  const sq = Math.sqrt;
  const goodWeeks = [...h.weeks.values()].filter(w => w.good).length;
  const distinct = new Set(data.workouts.flatMap(w => w.entries.map(e => e.key))).size;
  const base: Record<StatId, number> = {
    for: 1 + 1.2 * sq(total(f => f.heavySets)) + 2 * sq(total(f => f.e1rmRecords)),
    agi: 1 + 1.5 * sq(total(f => f.cardioMin) / 10) + 2 * sq(total(f => (f.dense ? 1 : 0))),
    vit: 1 + 4 * sq(goodWeeks) + sq(data.gamification.longestStreak),
    int: 1 + 1.5 * sq(total(f => (f.fromPlan ? 1 : 0))) + 1.5 * sq(total(f => f.loadUps)),
    des: 1 + 2 * sq(distinct) + 0.5 * sq(total(f => f.workSets)),
    sor: 1 + 3 * sq(Object.keys(data.gamification.achievements).length)
  };
  return STATS.map(({ id }) => {
    const b = Math.min(STAT_MAX, Math.floor(base[id]));
    const extra = Math.max(0, Math.floor(bonus[id] ?? 0));
    return { id, base: b, bonus: extra, total: Math.min(STAT_MAX, b + extra) };
  });
}

/** Classes do caminho gravado, conferindo a cadeia (1ª classe, depois uma 2ª dela). */
function resolvePath(state: RpgState): RpgClass[] {
  const out: RpgClass[] = [RPG_CLASS_BY_ID.aprendiz!];
  for (const step of state.path) {
    const cls = RPG_CLASS_BY_ID[step.classId];
    const prev = out[out.length - 1]!;
    if (!cls || cls.tier !== prev.tier + 1 || (cls.tier === 2 && cls.parent !== prev.id)) break;
    out.push(cls);
  }
  return out;
}

export function rpgView(data: AppData, now: Date): RpgView {
  const state = rpgOf(data);
  const today = toDateKey(now);
  const h = buildHistory(data);
  const chain = resolvePath(state);
  const stages: StageView[] = [];
  let idx = 0;
  let frac = 1;
  for (const cls of chain) {
    const need = stageNeed(cls.tier);
    let xp = 0;
    let startedOn: DateKey | null = null;
    while (idx < h.events.length && xp < need) {
      const ev = h.events[idx]!;
      const full = eventXp(ev, cls.path);
      startedOn ??= ev.date;
      if (xp + full * frac <= need) { xp += full * frac; idx++; frac = 1; }
      else { frac -= (need - xp) / full; xp = need; }
    }
    const mission = missionFor(cls, h, startedOn, data, today);
    stages.push({ cls, xp: Math.floor(xp), level: classLevel(cls.tier, xp), startedOn, ...(mission ? { mission } : {}) });
  }
  const current = stages[stages.length - 1]!;
  const remaining = h.events.slice(idx).map((ev, i) => ({ ev, frac: i === 0 ? frac : 1 }));
  const banked = Math.floor(remaining.reduce((n, r) => n + eventXp(r.ev, undefined) * r.frac, 0));

  const unlockedNext = current.level.capped && (current.mission?.done ?? true);
  const nextChoices = current.cls.tier === 0 ? FIRST_CLASSES : current.cls.tier === 1 ? secondClassesOf(current.cls.id) : [];
  const options: ClassOption[] = !unlockedNext ? [] : nextChoices.map(cls => {
    const days = remaining.filter(r => r.ev.kind === 'day');
    const affinity = cls.path === 'constancia'
      ? Math.min(1, h.weeks.size ? [...h.weeks.values()].filter(w => w.good).length / h.weeks.size : 0)
      : days.length ? days.reduce((n, r) => n + (r.ev.kind === 'day' ? r.ev.affinity[cls.path!] : 0), 0) / days.length : 0;
    const xp = remaining.reduce((n, r) => n + eventXp(r.ev, cls.path) * r.frac, 0);
    return { cls, affinity, startLevel: classLevel(cls.tier, xp).level };
  }).sort((a, b) => b.affinity - a.affinity || b.startLevel - a.startLevel);

  let nextHint: string | null = null;
  if (nextChoices.length && !unlockedNext) {
    nextHint = !current.level.capped
      ? `Chegue ao nível de classe ${CLASS_CAP[current.cls.tier]} para escolher a próxima classe.`
      : `Complete a missão para escolher a próxima classe.`;
  }

  const baseLevel = levelInfo(data.gamification.totalXP).level;
  const stats = computeStats(h, data, state.points);
  const earned = pointsForBaseLevel(baseLevel);
  const spent = stats.reduce((n, s) => n + s.bonus, 0);
  return {
    state, theme: state.theme, sex: data.profile.sex === 'feminino' ? 'f' : 'm', baseLevel, stages, current, banked, options, nextHint,
    stats, points: { earned, spent, free: Math.max(0, earned - spent) },
    history: { target: h.target, trainingDays: h.events.filter(e => e.kind === 'day').length, goodWeeks: [...h.weeks.values()].filter(w => w.good).length }
  };
}

export function className(cls: RpgClass, theme: RpgTheme, sex: 'm' | 'f'): string {
  return cls.names[theme][sex];
}

/** Level up ou troca de classe ainda não comemorados; null quando não há. */
export function pendingCelebration(view: RpgView): { kind: 'level' | 'class'; level: number } | null {
  if (!view.state.enabled) return null;
  const seen = view.state.celebrated;
  const { cls, level } = view.current;
  if (!seen) return null;
  if (seen.classId !== cls.id) return { kind: 'class', level: level.level };
  return level.level > seen.level ? { kind: 'level', level: level.level } : null;
}

// ---------- ações ----------

function withRpg(data: AppData, rpg: RpgState, now: Date): ActionResult {
  const draft: AppData = { ...data, rpg, sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } } };
  touch(draft, key.rpg, now);
  return { data: draft, events: [] };
}

const markSeen = (view: RpgView) => ({ classId: view.current.cls.id, level: view.current.level.level });

/** Liga ou desliga. Ao ligar, o que já foi conquistado com o histórico não dispara a animação. */
export function setRpgEnabled(data: AppData, enabled: boolean, now: Date): ActionResult {
  const rpg = { ...rpgOf(data), enabled };
  if (enabled) rpg.celebrated = markSeen(rpgView({ ...data, rpg }, now));
  return withRpg(data, rpg, now);
}

export function setRpgTheme(data: AppData, theme: RpgTheme, now: Date): ActionResult {
  return withRpg(data, { ...rpgOf(data), theme }, now);
}

/** Escolhe a próxima classe, se ela estiver liberada. A escolha é definitiva. */
export function chooseRpgClass(data: AppData, classId: string, now: Date): ActionResult {
  const view = rpgView(data, now);
  if (!view.options.some(o => o.cls.id === classId)) return { data, events: [] };
  const state = rpgOf(data);
  return withRpg(data, { ...state, path: [...state.path, { classId, at: now.toISOString() }] }, now);
}

/** Põe (+1) ou tira (−1) um ponto de bônus de um atributo. */
export function allocateRpgPoint(data: AppData, stat: StatId, delta: 1 | -1, now: Date): ActionResult {
  const view = rpgView(data, now);
  const current = view.state.points[stat] ?? 0;
  if (delta > 0 && (view.points.free <= 0 || (view.stats.find(s => s.id === stat)?.total ?? STAT_MAX) >= STAT_MAX)) return { data, events: [] };
  if (delta < 0 && current <= 0) return { data, events: [] };
  return withRpg(data, { ...view.state, points: { ...view.state.points, [stat]: current + delta } }, now);
}

export function markRpgCelebrated(data: AppData, now: Date): ActionResult {
  const view = rpgView(data, now);
  const seen = markSeen(view);
  if (view.state.celebrated?.classId === seen.classId && view.state.celebrated.level === seen.level) return { data, events: [] };
  return withRpg(data, { ...view.state, celebrated: seen }, now);
}
