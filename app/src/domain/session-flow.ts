// Sessão de treino: reabrir, pausar, treino esquecido, prévia e o que ficou para trás (ver session.ts).
import { toDateKey } from './dates';
import { normalizeExerciseName } from './text';
import { dayKeyOf, type AppData, type ExerciseMode, type Workout } from './model';
import { isCardioName } from '../data/exercise-library';
import { type SessionExercise, type ActiveSession } from './session-types';
import { initialSets, fromPlanExercise } from './session-start';

/**
 * W4: reabre um treino salvo (o esquecido que foi salvo sozinho): as séries voltam marcadas, com o
 * mesmo id, e ao concluir de novo ele substitui o salvo. O tempo entre o fim salvo e agora conta
 * como pausa, para a duração não crescer com a parada.
 */
export function reopenSession(data: AppData, w: Workout, now: Date): ActiveSession | null {
  if (!w.entries.length || !w.startedAt) return null;
  const planExercises = Object.values(data.plans[w.planId ?? '']?.days ?? {}).flatMap(d => d.exercises);
  const exercises = w.entries.map((entry, i): SessionExercise => {
    const planEx = planExercises.find(p => normalizeExerciseName(p.name) === entry.key);
    const ex: SessionExercise = {
      slotId: planEx?.id ?? `reaberto-${i}`, name: entry.name, key: entry.key, mode: entry.mode, optional: false,
      sets: entry.sets.map(({ reps, weight, kind, failure, technique, rpe, note }) => ({ reps, weight, kind, done: true, ...(failure ? { failure } : {}), ...(technique ? { technique } : {}), ...(rpe ? { rpe } : {}), ...(note ? { note } : {}) })),
      note: entry.note ?? '', alternatives: planEx?.alternatives ?? []
    };
    if (entry.mode === 'cardio') ex.cardio = { minutes: entry.cardio?.minutes ?? 20, km: entry.cardio?.km ?? 0, done: true };
    if (entry.mode === 'time' && entry.sets[0]) ex.seconds = entry.sets[0].reps;
    if (planEx?.restSeconds !== undefined) ex.restSeconds = planEx.restSeconds;
    if (entry.perSide) ex.perSide = true;
    // as séries do plano que não chegaram a ser feitas voltam, desmarcadas (cópia da última)
    const work = ex.sets.filter(x => x.kind === 'work');
    const last = work[work.length - 1];
    if (planEx && entry.mode !== 'cardio' && last && planEx.sets > work.length) {
      for (let k = work.length; k < Math.min(20, planEx.sets); k++) ex.sets.push({ reps: last.reps, weight: last.weight, kind: 'work', done: false });
    }
    return ex;
  });
  // os exercícios do plano que ficaram sem nenhuma série também voltam, no fim
  const linear = data.plans[w.planId ?? '']?.progression === 'linear';
  for (const name of w.skipped ?? []) {
    const planEx = planExercises.find(p => normalizeExerciseName(p.name) === normalizeExerciseName(name));
    if (planEx && !exercises.some(e => e.key === normalizeExerciseName(name))) exercises.push(fromPlanExercise(data, planEx, w.date, linear));
  }
  const ended = Date.parse(w.endedAt ?? w.startedAt);
  return {
    id: w.id, date: w.date, startedAt: w.startedAt, planId: w.planId ?? '', dayKey: w.dayKey ?? dayKeyOf(now), dayName: w.dayName ?? 'Treino',
    exercises, pausedMs: Math.max(0, now.getTime() - ended), lastActivityAt: now.toISOString(),
    ...(w.form ? { form: w.form } : {}), ...(w.light ? { light: w.light } : {})
  };
}

/** X9: até quando um treino salvo sozinho ainda pode ser reaberto depois do fim, fora do dia dele. */
export const REOPEN_HOURS = 12;

/**
 * X9: o treino salvo sozinho pode ser reaberto no dia dele, ou até 12 horas depois do fim (o
 * treino que passou da meia-noite). Depois disso é histórico: corrige-se pelo Progresso.
 */
export function canReopen(w: Workout, now: Date): boolean {
  if (!w.autoFinished || !w.startedAt || !w.entries.length) return false;
  if (w.date === toDateKey(now)) return true;
  const since = now.getTime() - Date.parse(w.endedAt ?? w.startedAt);
  return since >= 0 && since < REOPEN_HOURS * 3_600_000;
}

/** W3: pausa o treino (o relógio para). */
export function pauseSession(s: ActiveSession, now: Date): ActiveSession {
  return s.pausedAt || s.backdated ? s : { ...s, pausedAt: now.toISOString() };
}

/** W3: continua o treino; o tempo pausado fica de fora da duração. */
export function resumeSession(s: ActiveSession, now: Date): ActiveSession {
  if (!s.pausedAt) return s;
  const { pausedAt, ...rest } = s;
  const extra = Math.max(0, now.getTime() - Date.parse(pausedAt));
  return { ...rest, pausedMs: (s.pausedMs ?? 0) + extra, lastActivityAt: now.toISOString() };
}

/** W3: tempo de treino em ms, sem as pausas. */
export function activeMs(s: ActiveSession, now: Date): number {
  const paused = (s.pausedMs ?? 0) + (s.pausedAt ? Math.max(0, now.getTime() - Date.parse(s.pausedAt)) : 0);
  return Math.max(0, now.getTime() - Date.parse(s.startedAt) - paused);
}

/** W4: a última vez que a pessoa mexeu no treino (ou o início). */
export const lastActivity = (s: ActiveSession): number => Date.parse(s.lastActivityAt ?? s.startedAt);

/**
 * W4: o treino esquecido aberto. 'ask' depois de `minutes` sem mexer; 'finish' depois de mais 5
 * minutos sem resposta (só se há algo feito para salvar). Pausado, registrado depois ou na
 * prévia, nunca.
 */
export function forgottenState(s: ActiveSession, now: Date, minutes: number): 'ok' | 'ask' | 'finish' {
  if (!(minutes > 0) || s.pausedAt || s.backdated || s.preview) return 'ok';
  const idle = now.getTime() - lastActivity(s);
  if (idle < minutes * 60000) return 'ok';
  const anyDone = s.exercises.some(ex => ex.sets.some(x => x.done) || ex.cardio?.done);
  return idle >= (minutes + 5) * 60000 && anyDone ? 'finish' : 'ask';
}

/** W4: a hora em que o treino esquecido acabou de verdade: a última mexida mais um descanso. */
export function forgottenEnd(s: ActiveSession, restSeconds: number, now: Date): Date {
  return new Date(Math.min(now.getTime(), lastActivity(s) + Math.max(0, restSeconds) * 1000));
}

/** W11: sai da prévia; o relógio começa agora. */
export function startFromPreview(s: ActiveSession, now: Date): ActiveSession {
  if (!s.preview) return s;
  const { preview: _p, ...rest } = s;
  return { ...rest, startedAt: now.toISOString(), lastActivityAt: now.toISOString() };
}

/**
 * W13: põe no começo do treino os exercícios que ficaram para trás da última vez (os que já estão
 * nele ficam de fora). Com o plano, abrem como no plano; senão, com a carga da última vez.
 */
export function addLeftovers(s: ActiveSession, data: AppData, names: readonly string[]): ActiveSession {
  const have = new Set(s.exercises.map(ex => ex.key));
  const planEx = Object.values(data.plans[s.planId]?.days ?? {}).flatMap(d => d.exercises);
  const linear = data.plans[s.planId]?.progression === 'linear';
  const added: SessionExercise[] = [];
  for (const name of names) {
    const key = normalizeExerciseName(name);
    if (!key || have.has(key)) continue;
    have.add(key);
    const fromPlan = planEx.find(p => normalizeExerciseName(p.name) === key);
    const slotId = `sobra-${added.length}-${key}`;
    if (fromPlan) {
      added.push({ ...fromPlanExercise(data, fromPlan, s.date, linear), slotId });
      continue;
    }
    const mode: ExerciseMode = isCardioName(name) ? 'cardio' : 'reps';
    const ex: SessionExercise = { slotId, name, key, mode, optional: false, sets: initialSets(data, name, mode, null, s.date).sets, note: '', alternatives: [] };
    if (mode === 'cardio') ex.cardio = { minutes: 20, km: 0, done: false };
    added.push(ex);
  }
  if (!added.length || s.exercises.length + added.length > 30) return s;
  return { ...s, exercises: [...added, ...s.exercises] };
}
