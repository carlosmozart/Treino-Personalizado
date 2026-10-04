// Ações do app como funções puras: (dados, argumentos, agora) → dados novos + eventos.
// Cada ação trabalha numa cópia; o original nunca é alterado (a store compara referências e
// a interface pode desfazer guardando o anterior).
import { toDateKey, type DateKey } from './dates';
import type { DayKey } from './ai-plan';
import { recordGoalCheckpoints } from './body-goal';
import type { AppData, Plan, Settings, UserProfile, Workout, WorkoutEntry } from './model';
import { checkBirthday, checkWaterGoal, grantCheckin, revokeCheckin, type RewardEvent } from './rewards';
import { sessionProgress, sessionToWorkout, type ActiveSession } from './session';
import { bestSet, isPersonalRecord } from './workouts';
import { key, tombstone, touch } from './sync';

export interface ActionResult {
  data: AppData;
  events: RewardEvent[];
}

const unchanged = (data: AppData): ActionResult => ({ data, events: [] });

function byDateThenStart(a: Workout, b: Workout): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.startedAt ?? '').localeCompare(b.startedAt ?? '');
}

export type FinishResult =
  | (ActionResult & { kind: 'saved'; workout: Workout; full: boolean })
  | { kind: 'empty' };

/**
 * Finaliza o treino: grava só o que foi marcado, faz o check-in do dia (cheio se todos os
 * obrigatórios foram concluídos, meio caso contrário) e aponta os recordes.
 */
export function finishWorkout(data: AppData, session: ActiveSession, now: Date): FinishResult {
  const workout = sessionToWorkout(session, now);
  if (!workout) return { kind: 'empty' };
  const draft = structuredClone(data);
  const events: RewardEvent[] = [];
  draft.workouts = [...draft.workouts.filter(w => w.id !== workout.id), workout].sort(byDateThenStart);
  touch(draft, key.workout(workout.id), now);

  for (const entry of workout.entries) {
    const best = bestSet(entry);
    if (best && isPersonalRecord(draft.workouts, workout, entry)) {
      events.push({ kind: 'record', name: entry.name, reps: best.reps, weight: best.weight });
    }
  }

  const { complete } = sessionProgress(session);
  // um treino finalizado de um dia passado (sessão esquecida aberta) faz check-in daquele dia
  draft.checkins[workout.date] = { dayKey: session.dayKey };
  touch(draft, key.checkin(workout.date), now);
  grantCheckin(draft, workout.date, complete, now, events);
  return { kind: 'saved', data: draft, events, workout, full: complete };
}

/** Check-in manual: só hoje. Marcar sem treino registrado vale meio XP; desmarcar devolve o XP. */
export function toggleCheckin(data: AppData, dayKey: DayKey | null, now: Date): ActionResult {
  const today = toDateKey(now);
  const draft = structuredClone(data);
  const events: RewardEvent[] = [];
  if (draft.checkins[today]) {
    delete draft.checkins[today];
    tombstone(draft, key.checkin(today), now);
    revokeCheckin(draft, today, events);
  } else {
    draft.checkins[today] = { dayKey };
    touch(draft, key.checkin(today), now);
    grantCheckin(draft, today, false, now, events);
  }
  return { data: draft, events };
}

export const MAX_WATER_ML = 10_000;

export function addWater(data: AppData, deltaMl: number, now: Date): ActionResult {
  const today = toDateKey(now);
  const current = data.water[today] ?? 0;
  const next = Math.min(MAX_WATER_ML, Math.max(0, Math.round(current + deltaMl)));
  if (next === current) return unchanged(data);
  const draft = structuredClone(data);
  const events: RewardEvent[] = [];
  if (next) {
    draft.water[today] = next;
    touch(draft, key.water(today), now);
  } else {
    delete draft.water[today];
    tombstone(draft, key.water(today), now);
  }
  checkWaterGoal(draft, today, events);
  return { data: draft, events };
}

/** Pesagem: uma por dia (a nova substitui), peso atual = pesagem mais recente. */
export function logWeight(data: AppData, weightKg: number, date: DateKey, now: Date): ActionResult {
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) return unchanged(data);
  const weight = Math.round(weightKg * 10) / 10;
  const draft = structuredClone(data);
  const p = draft.profile;
  p.weighIns = [...p.weighIns.filter(w => w.date !== date), { date, weight }].sort((a, b) => a.date.localeCompare(b.date));
  const latest = p.weighIns[p.weighIns.length - 1]!;
  p.weightKg = latest.weight;
  if (p.weightGoal) p.weightGoal = recordGoalCheckpoints(p.weightGoal, latest.weight, latest.date);
  touch(draft, key.weighIn(date), now);
  return { data: draft, events: [] };
}

export function removeWeighIn(data: AppData, date: DateKey, now: Date): ActionResult {
  if (!data.profile.weighIns.some(w => w.date === date)) return unchanged(data);
  const draft = structuredClone(data);
  draft.profile.weighIns = draft.profile.weighIns.filter(w => w.date !== date);
  const latest = draft.profile.weighIns[draft.profile.weighIns.length - 1];
  if (latest) draft.profile.weightKg = latest.weight;
  tombstone(draft, key.weighIn(date), now);
  return { data: draft, events: [] };
}

export function deleteWorkout(data: AppData, id: string, now: Date): ActionResult {
  if (!data.workouts.some(w => w.id === id)) return unchanged(data);
  // o check-in do dia fica: ele registra presença, não o conteúdo do treino
  const draft = structuredClone(data);
  draft.workouts = draft.workouts.filter(w => w.id !== id);
  tombstone(draft, key.workout(id), now);
  return { data: draft, events: [] };
}

/** Corrige um exercício registrado (registro antigo editado deixa de ser "reconstruído"). */
export function updateWorkoutEntry(data: AppData, workoutId: string, index: number, entry: WorkoutEntry, now: Date): ActionResult {
  const w = data.workouts.find(x => x.id === workoutId);
  if (!w || !w.entries[index]) return unchanged(data);
  const draft = structuredClone(data);
  const target = draft.workouts.find(x => x.id === workoutId)!;
  const fixed: WorkoutEntry = { ...structuredClone(entry), sets: entry.sets.filter(s => s.reps > 0 || s.weight > 0) };
  delete fixed.aggregated;
  target.entries[index] = fixed;
  touch(draft, key.workout(workoutId), now);
  return { data: draft, events: [] };
}

/** Apaga um exercício do treino; se era o único, apaga o treino. */
export function removeWorkoutEntry(data: AppData, workoutId: string, index: number, now: Date): ActionResult {
  const w = data.workouts.find(x => x.id === workoutId);
  if (!w || !w.entries[index]) return unchanged(data);
  if (w.entries.length === 1) return deleteWorkout(data, workoutId, now);
  const draft = structuredClone(data);
  draft.workouts.find(x => x.id === workoutId)!.entries.splice(index, 1);
  touch(draft, key.workout(workoutId), now);
  return { data: draft, events: [] };
}

/** Conquista "Os Pesos de Rock Lee": subiu 10 kg de uma vez pelo botão de ajuste. */
export function markBigWeightJump(data: AppData): ActionResult {
  if (data.gamification.bigWeightJump) return unchanged(data);
  return { data: { ...data, gamification: { ...data.gamification, bigWeightJump: true } }, events: [] };
}

type ProfilePatch = Partial<Omit<UserProfile, 'weighIns' | 'weightKg'>>;

/** Dados de cadastro. O peso muda por logWeight, para manter o histórico coerente. */
export function updateProfile(data: AppData, patch: ProfilePatch, now: Date): ActionResult {
  const draft = { ...data, profile: { ...data.profile, ...patch }, sync: cloneSync(data) };
  touch(draft, key.profile, now);
  return { data: draft, events: [] };
}

export function updateSettings(data: AppData, patch: Partial<Settings>, now: Date): ActionResult {
  const settings = { ...data.settings, ...patch };
  settings.restSeconds = Math.min(600, Math.max(15, Math.round(settings.restSeconds)));
  const draft = { ...data, settings, sync: cloneSync(data) };
  touch(draft, key.settings, now);
  return { data: draft, events: [] };
}

/** Adiciona um plano (id novo se já existir) e, por padrão, ativa. */
export function addPlan(data: AppData, plan: Plan, now: Date, activate = true): ActionResult {
  let id = plan.id;
  for (let n = 2; data.plans[id]; n++) id = `${plan.id}-${n}`;
  const draft: AppData = { ...data, plans: { ...data.plans, [id]: { ...plan, id } }, sync: cloneSync(data) };
  touch(draft, key.plan(id), now);
  if (activate) {
    draft.activePlanId = id;
    draft.gamification = { ...data.gamification, activatedPlans: { ...data.gamification.activatedPlans, [id]: true } };
    touch(draft, key.activePlan, now);
  }
  return { data: draft, events: [] };
}

export function setActivePlan(data: AppData, planId: string, now: Date): ActionResult {
  if (!data.plans[planId] || data.activePlanId === planId) return unchanged(data);
  const draft = { ...data, activePlanId: planId, sync: cloneSync(data) };
  touch(draft, key.activePlan, now);
  return { data: draft, events: [] };
}

/** Saudações do dia ao abrir o app (aniversário). */
export function dailyCheck(data: AppData, now: Date): ActionResult {
  const draft = structuredClone(data);
  const events: RewardEvent[] = [];
  checkBirthday(draft, now, events);
  return events.length ? { data: draft, events } : unchanged(data);
}

const cloneSync = (data: AppData): AppData['sync'] => ({ changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } });
