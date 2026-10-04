// Ações do app como funções puras: (dados, argumentos, agora) → dados novos + eventos.
// Cada ação trabalha numa cópia; o original nunca é alterado (a store compara referências e
// a interface pode desfazer guardando o anterior).
import { toDateKey, type DateKey } from './dates';
import type { DayKey } from './ai-plan';
import { recordGoalCheckpoints } from './body-goal';
import type { AppData, Settings, UserProfile, Workout } from './model';
import { checkBirthday, checkWaterGoal, grantCheckin, revokeCheckin, type RewardEvent } from './rewards';
import { sessionProgress, sessionToWorkout, type ActiveSession } from './session';
import { bestSet, isPersonalRecord } from './workouts';

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

  for (const entry of workout.entries) {
    const best = bestSet(entry);
    if (best && isPersonalRecord(draft.workouts, workout, entry)) {
      events.push({ kind: 'record', name: entry.name, reps: best.reps, weight: best.weight });
    }
  }

  const { complete } = sessionProgress(session);
  // um treino finalizado de um dia passado (sessão esquecida aberta) faz check-in daquele dia
  draft.checkins[workout.date] = { dayKey: session.dayKey };
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
    revokeCheckin(draft, today, events);
  } else {
    draft.checkins[today] = { dayKey };
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
  if (next) draft.water[today] = next;
  else delete draft.water[today];
  checkWaterGoal(draft, today, events);
  return { data: draft, events };
}

/** Pesagem: uma por dia (a nova substitui), peso atual = pesagem mais recente. */
export function logWeight(data: AppData, weightKg: number, date: DateKey): ActionResult {
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) return unchanged(data);
  const weight = Math.round(weightKg * 10) / 10;
  const draft = structuredClone(data);
  const p = draft.profile;
  p.weighIns = [...p.weighIns.filter(w => w.date !== date), { date, weight }].sort((a, b) => a.date.localeCompare(b.date));
  const latest = p.weighIns[p.weighIns.length - 1]!;
  p.weightKg = latest.weight;
  if (p.weightGoal) p.weightGoal = recordGoalCheckpoints(p.weightGoal, latest.weight, latest.date);
  return { data: draft, events: [] };
}

export function removeWeighIn(data: AppData, date: DateKey): ActionResult {
  if (!data.profile.weighIns.some(w => w.date === date)) return unchanged(data);
  const draft = structuredClone(data);
  draft.profile.weighIns = draft.profile.weighIns.filter(w => w.date !== date);
  const latest = draft.profile.weighIns[draft.profile.weighIns.length - 1];
  if (latest) draft.profile.weightKg = latest.weight;
  return { data: draft, events: [] };
}

export function deleteWorkout(data: AppData, id: string): ActionResult {
  if (!data.workouts.some(w => w.id === id)) return unchanged(data);
  // o check-in do dia fica: ele registra presença, não o conteúdo do treino
  return { data: { ...data, workouts: data.workouts.filter(w => w.id !== id) }, events: [] };
}

type ProfilePatch = Partial<Omit<UserProfile, 'weighIns' | 'weightKg'>>;

/** Dados de cadastro. O peso muda por logWeight, para manter o histórico coerente. */
export function updateProfile(data: AppData, patch: ProfilePatch): ActionResult {
  return { data: { ...data, profile: { ...data.profile, ...patch } }, events: [] };
}

export function updateSettings(data: AppData, patch: Partial<Settings>): ActionResult {
  const settings = { ...data.settings, ...patch };
  settings.restSeconds = Math.min(600, Math.max(15, Math.round(settings.restSeconds)));
  return { data: { ...data, settings }, events: [] };
}

export function setActivePlan(data: AppData, planId: string): ActionResult {
  if (!data.plans[planId] || data.activePlanId === planId) return unchanged(data);
  return { data: { ...data, activePlanId: planId }, events: [] };
}

/** Saudações do dia ao abrir o app (aniversário). */
export function dailyCheck(data: AppData, now: Date): ActionResult {
  const draft = structuredClone(data);
  const events: RewardEvent[] = [];
  checkBirthday(draft, now, events);
  return events.length ? { data: draft, events } : unchanged(data);
}
