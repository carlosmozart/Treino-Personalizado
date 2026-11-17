// Sessão de treino: montar os exercícios e começar (plano, treino livre, passado, repetir), aquecimento automático e treino mais leve (ver session.ts).
import type { DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { toDateKey } from './dates';
import { normalizeExerciseName } from './text';
import { dayKeyOf, loadSourceOf, type AppData, type DailyForm, type ExerciseMode, type LightKind, type PlanExercise, type Settings, type Workout } from './model';
import { lastSessionBefore, workSets } from './workouts';
import { isCardioName } from '../data/exercise-library';
import { repRange, suggestProgression, type Progression } from './progression';
import { rotationTitle } from './rotation';
import { isDeloadDate, progressionWorkouts } from './deload';
import { isCompound, warmupConfig, warmupRamp } from './warmup';
import { snapStack } from './stack';
import { type SessionSet, type SessionExercise, type ActiveSession } from './session-types';

export const round1 = (n: number) => Math.round(n * 10) / 10;
/** Carga em centésimos (41,25 kg existe com anilhas de 1,25). */
export const roundKg = (n: number) => Math.round(n * 100) / 100;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export type PlanTarget = Pick<PlanExercise, 'sets' | 'reps' | 'weight' | 'seconds' | 'repMin' | 'repMax' | 'increment' | 'lockWeight' | 'stack'> & { linear?: boolean };

/**
 * Séries iniciais de um exercício, conforme a fonte escolhida (M13):
 * - 'auto': sugestão da progressão (M10–M12, docs/dev/progressao.md);
 * - 'last': repetições do plano e carga da última sessão (última série válida);
 * - 'plan': repetições e carga do plano, como estão escritas.
 * Sem histórico, a carga é a do plano em todos os casos.
 */
export function initialSets(data: AppData, name: string, mode: ExerciseMode, plan: PlanTarget | null, date: DateKey): { sets: SessionSet[]; progression?: Progression } {
  if (mode === 'cardio') return { sets: [] };
  const key = normalizeExerciseName(name);
  // M32: a carga sugerida vem dos treinos normais; na semana de deload, sem subir carga
  const last = lastSessionBefore(progressionWorkouts(data.workouts), key, date);
  const lastSets = last ? workSets(last.entry) : [];
  // W14: sem plano nem histórico, os números que a pessoa escolheu para exercício novo
  const count = plan?.sets || lastSets.length || data.settings.newExerciseSets || 3;
  // faixa de reps: abre no começo (8 de 8–12); o topo é a meta. Linear: as reps fixas do plano
  const planReps = plan && mode === 'reps' ? (plan.linear ? repRange(plan).max : repRange(plan).min) : plan?.reps;
  let reps = mode === 'time' ? (plan?.seconds ?? lastSets[0]?.reps ?? 30) : (planReps || lastSets[0]?.reps || data.settings.newExerciseReps || 10);
  let weight = lastSets.length ? lastSets[lastSets.length - 1]!.weight : (plan?.weight ?? 0);
  const source = loadSourceOf(data.settings);
  if (source === 'plan' && plan) {
    weight = plan.weight;
    if (mode === 'reps') reps = planReps ?? reps;
  }
  // carga travada: a do plano (ou, sem ela, a da última vez), e a progressão não sugere subir
  if (plan?.lockWeight) {
    if (plan.weight > 0) weight = plan.weight;
    const sets = Array.from({ length: count }, () => ({ reps, weight, kind: 'work' as const, done: false }));
    return { sets };
  }
  let progression = mode === 'reps' && plan && source === 'auto' && !isDeloadDate(data, date)
    ? suggestProgression(data.workouts, key, plan, date) ?? undefined
    : undefined;
  if (progression) ({ reps, weight } = progression);
  // T23: com a pilha da máquina, a carga cai num peso que o pino escolhe (subir é o próximo pino)
  if (plan?.stack?.length && weight > 0) {
    const lastWeight = lastSets.length ? lastSets[lastSets.length - 1]!.weight : weight;
    weight = progression?.kind === 'up' ? snapStack(lastWeight, plan.stack, 'up')
      : progression?.kind === 'deload' ? snapStack(weight + 1e-6, plan.stack, 'down')
      : snapStack(weight, plan.stack, 'near');
    if (progression) progression = { ...progression, weight };
  }
  const sets = Array.from({ length: count }, () => ({ reps, weight, kind: 'work' as const, done: false }));
  return progression?.reason ? { sets, progression } : { sets };
}

export function fromPlanExercise(data: AppData, ex: PlanExercise, date: DateKey, linear = false): SessionExercise {
  const out: SessionExercise = {
    slotId: ex.id,
    name: ex.name,
    key: normalizeExerciseName(ex.name),
    mode: ex.mode,
    optional: ex.optional,
    sets: [],
    note: '',
    alternatives: ex.alternatives
  };
  const start = initialSets(data, ex.name, ex.mode, { ...ex, linear }, date);
  out.sets = start.sets;
  if (start.progression) out.progression = start.progression;
  if (ex.mode === 'time' && ex.seconds) out.seconds = ex.seconds;
  // 0 = sem cronômetro neste exercício (antes caía no descanso padrão)
  if (ex.restSeconds !== undefined) out.restSeconds = ex.restSeconds;
  if (ex.tip) out.tip = ex.tip;
  if (ex.superset) out.superset = ex.superset;
  if (ex.perSide && ex.mode === 'reps') {
    out.perSide = true;
    if (ex.sideRestSeconds) out.sideRestSeconds = ex.sideRestSeconds;
  }
  if (ex.mode === 'cardio') out.cardio = { minutes: ex.minutes, km: ex.km, done: false, ...lastLevel(data, ex.name, date) };
  if (ex.lockWeight && ex.mode !== 'cardio') out.lockWeight = true;
  if (ex.stack?.length && ex.mode !== 'cardio') out.stack = [...ex.stack];
  // aquecimento guardado no plano: metade da carga, 10 reps (como "Adicionar série de aquecimento")
  if (ex.warmupSets && ex.mode === 'reps') {
    let withWarmups: SessionExercise = out;
    for (let i = 0; i < Math.min(5, ex.warmupSets); i++) withWarmups = warmupInto(withWarmups);
    return withWarmups;
  }
  return withAutoWarmup(out, data.settings);
}

/** Uma série de aquecimento antes das de trabalho: metade da carga da primeira, 10 reps. */
export function warmupInto(ex: SessionExercise): SessionExercise {
  if (ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
  const firstWork = ex.sets.find(x => x.kind === 'work');
  const at = ex.sets.filter(x => x.kind === 'warmup').length;
  const weight = Math.round(((firstWork?.weight ?? 0) / 2) * 2) / 2;
  const sets = [...ex.sets];
  sets.splice(at, 0, { reps: 10, weight, kind: 'warmup', done: false });
  return { ...ex, sets };
}

/** W2: o check-in do dia fica na sessão (e vai para o treino salvo). */
export function setSessionForm(s: ActiveSession, form: DailyForm): ActiveSession {
  const clean: DailyForm = {};
  for (const k of ['sono', 'energia', 'dor', 'estresse'] as const) {
    const v = form[k];
    if (v !== undefined && v >= 1 && v <= 5) clean[k] = Math.round(v);
  }
  return { ...s, form: clean };
}

/**
 * W2: treino de hoje mais leve. 'carga': 10% a menos nas séries de trabalho ainda não feitas,
 * arredondado para baixo ao passo da carga (anilhas aos pares na barra); 'series': uma série de
 * trabalho a menos por exercício (a última ainda não feita, se sobrar pelo menos uma).
 */
export function lightenSession(s: ActiveSession, kind: LightKind, settings: Pick<Settings, 'barWeight' | 'plates'>): ActiveSession {
  if (s.light) return s;
  const exercises = s.exercises.map(ex => {
    if (ex.mode === 'cardio') return ex;
    if (kind === 'series') {
      const work = ex.sets.filter(x => x.kind === 'work');
      if (work.length < 2) return ex;
      const i = ex.sets.map((x, j) => (x.kind === 'work' && !x.done ? j : -1)).filter(j => j >= 0).pop();
      return i === undefined ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== i) };
    }
    const { bar, step } = warmupConfig(ex.name, settings);
    const lighter = (kg: number) => {
      if (kg <= 0) return kg;
      const target = kg * 0.9;
      // X11: na máquina com pilha (T23), o pino logo abaixo dos 90% (ou o mais leve da pilha)
      if (ex.stack?.length) return Math.min(kg, [...ex.stack].reverse().find(w => w <= target + 1e-9) ?? ex.stack[0]!);
      const st = bar === null && kg < 20 ? 0.5 : step;
      const base = bar ?? 0;
      const out = target <= base ? Math.min(kg, base) : base + Math.floor((target - base) / st + 1e-9) * st;
      return roundKg(out);
    };
    const moved = { ...ex, sets: ex.sets.map(x => (x.kind === 'work' && !x.done ? { ...x, weight: lighter(x.weight) } : x)) };
    return refreshAutoWarmup(moved);
  });
  return { ...s, exercises, light: kind };
}

/** W19: o nível de resistência da última vez, para o cardio abrir nele. */
export function lastLevel(data: AppData, name: string, date: DateKey): { level?: number } {
  const level = lastSessionBefore(data.workouts, normalizeExerciseName(name), date)?.entry.cardio?.level;
  return level ? { level } : {};
}

/** Maior carga das séries de trabalho: o alvo da rampa de aquecimento. */
export const topWork = (sets: readonly SessionSet[]) => Math.max(0, ...sets.filter(x => x.kind === 'work').map(x => x.weight));

/**
 * V8: põe a rampa de aquecimento automático antes das séries de trabalho, quando ligada em Perfil
 * e o exercício é composto, por repetições e com carga.
 */
export function withAutoWarmup(ex: SessionExercise, settings: Pick<Settings, 'autoWarmup' | 'barWeight' | 'plates'>): SessionExercise {
  if (!settings.autoWarmup || ex.mode !== 'reps' || ex.perSide || !isCompound(ex.name) || ex.sets.some(x => x.kind === 'warmup')) return ex;
  const config = warmupConfig(ex.name, settings);
  const ramp = warmupRamp(topWork(ex.sets), config);
  // sem rampa agora (carga 0 ou leve), mas guarda o jeito: se a carga subir no treino, ela aparece
  return { ...ex, autoWarmup: config, sets: [...ramp.map(r => ({ ...r, kind: 'warmup' as const, done: false, auto: true as const })), ...ex.sets] };
}

/**
 * V8: refaz a parte ainda não feita da rampa quando a carga de trabalho muda. O aquecimento já feito
 * fica; o que vem depois continua dele para cima. Aquecimento editado à mão não é mexido.
 */
export function refreshAutoWarmup(ex: SessionExercise): SessionExercise {
  if (!ex.autoWarmup) return ex;
  const isAuto = (x: SessionSet) => x.kind === 'warmup' && !!x.auto;
  // a pessoa mexeu no aquecimento à mão (editou ou pôs outro): a rampa para de acompanhar
  if (ex.sets.some(x => x.kind === 'warmup' && !x.auto && !x.done)) return ex;
  const floor = Math.max(0, ...ex.sets.filter(x => x.kind === 'warmup' && x.done).map(x => x.weight));
  const ramp = warmupRamp(topWork(ex.sets), ex.autoWarmup).filter(r => r.weight > floor);
  const pending = ex.sets.filter(x => isAuto(x) && !x.done);
  if (pending.length === ramp.length && pending.every((x, i) => x.weight === ramp[i]!.weight && x.reps === ramp[i]!.reps)) return ex;
  const kept = ex.sets.filter(x => !(isAuto(x) && !x.done));
  const at = kept.filter(x => x.kind === 'warmup').length;
  const sets = [...kept];
  sets.splice(at, 0, ...ramp.map(r => ({ ...r, kind: 'warmup' as const, done: false, auto: true as const })));
  return { ...ex, sets };
}

export function startSession(data: AppData, planId: string, dayKey: DayKey, now: Date, id: string): ActiveSession | null {
  const plan = data.plans[planId];
  const day = plan?.days[dayKey];
  if (!plan || !day || !day.exercises.length) return null;
  const date = toDateKey(now);
  return {
    // na rotação, sem o "Segunda:" que os modelos põem no nome (o treino não é da segunda)
    id, date, startedAt: now.toISOString(), planId, dayKey, dayName: plan.rotation ? rotationTitle(plan, dayKey) : day.name,
    exercises: day.exercises.map(ex => fromPlanExercise(data, ex, date, plan.progression === 'linear'))
  };
}

/**
 * M15: registrar um treino de um dia passado. Abre como um treino normal (com a carga sugerida
 * pelo histórico até aquela data); ao finalizar, entra com a data, o início e a duração informados.
 */
export function startPastSession(data: AppData, planId: string, dayKey: DayKey, date: DateKey, time: string, durationMin: number, id: string): ActiveSession | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  const started = new Date(`${date}T00:00:00`);
  started.setHours(Math.min(23, match ? Number(match[1]) : 18), Math.min(59, match ? Number(match[2]) : 0));
  const s = startSession(data, planId, dayKey, started, id);
  if (!s) return null;
  return { ...s, date, backdated: { durationMin: Math.min(300, Math.max(1, Math.round(durationMin))) } };
}

/**
 * Treino livre: começa vazio, sem plano, e os exercícios entram por "Adicionar exercício". Sem
 * plano, não conta como treino da rotação.
 */
export function startFreeSession(now: Date, id: string): ActiveSession {
  return { id, date: toDateKey(now), startedAt: now.toISOString(), planId: '', dayKey: dayKeyOf(now), dayName: 'Treino livre', exercises: [] };
}

/** Começo do slotId de um exercício posto com "Adicionar exercício" (T13 o reconhece no fim). */
export const EXTRA_PREFIX = 'extra-';

/** M18: põe um exercício no fim do treino em andamento, com a carga da última vez (ou 3×10). */
export function addExerciseToSession(s: ActiveSession, data: AppData, name: string): ActiveSession {
  const clean = name.trim();
  if (!clean || s.exercises.length >= 30) return s;
  const mode: ExerciseMode = isCardioName(clean) ? 'cardio' : 'reps';
  let ex: SessionExercise = {
    slotId: `${EXTRA_PREFIX}${s.exercises.length}-${normalizeExerciseName(clean)}`, name: clean, key: normalizeExerciseName(clean), mode,
    optional: false, sets: initialSets(data, clean, mode, null, s.date).sets, note: '', alternatives: []
  };
  if (mode === 'cardio') ex.cardio = { minutes: 20, km: 0, done: false, ...lastLevel(data, clean, s.date) };
  ex = withAutoWarmup(ex, data.settings);
  return { ...s, exercises: [...s.exercises, ex] };
}

/** M18: tira um exercício do treino em andamento (sempre fica pelo menos um). */
export function removeExerciseFromSession(s: ActiveSession, index: number): ActiveSession {
  if (s.exercises.length <= 1 || !s.exercises[index]) return s;
  return { ...s, exercises: s.exercises.filter((_, i) => i !== index) };
}

/**
 * Repetir hoje (R4): um treino do histórico vira o treino de hoje, com os mesmos exercícios e os
 * mesmos números, nada marcado. Dica, descanso e reservas vêm do plano quando o exercício está nele.
 */
export function repeatSession(data: AppData, workout: Workout, now: Date, id: string): ActiveSession | null {
  if (!workout.entries.length) return null;
  const planId = workout.planId && data.plans[workout.planId] ? workout.planId : (data.activePlanId ?? '');
  const dayKey = workout.dayKey ?? dayKeyOf(now);
  const planExercises = Object.values(data.plans[planId]?.days ?? {}).flatMap(d => d.exercises);
  const exercises = workout.entries.map((entry, i): SessionExercise => {
    const planEx = planExercises.find(p => normalizeExerciseName(p.name) === entry.key);
    const ex: SessionExercise = {
      slotId: planEx?.id ?? `repetir-${i}`,
      name: entry.name,
      key: entry.key,
      mode: entry.mode,
      optional: false,
      sets: entry.sets.map(set => ({ reps: set.reps, weight: set.weight, kind: set.kind, done: false })),
      note: '',
      alternatives: planEx?.alternatives ?? []
    };
    if (entry.mode === 'cardio') ex.cardio = { minutes: entry.cardio?.minutes ?? 20, km: entry.cardio?.km ?? 0, done: false };
    if (entry.mode === 'time' && entry.sets[0]) ex.seconds = entry.sets[0].reps;
    if (planEx?.restSeconds !== undefined) ex.restSeconds = planEx.restSeconds;
    if (planEx?.tip) ex.tip = planEx.tip;
    if (entry.perSide) ex.perSide = true;
    return ex;
  });
  return {
    id, date: toDateKey(now), startedAt: now.toISOString(), planId, dayKey,
    dayName: workout.dayName || 'Treino repetido', exercises
  };
}
