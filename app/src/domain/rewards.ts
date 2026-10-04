// Recompensas (XP, nível, bônus de sequência, refeição livre, água, aniversário).
// Trabalham sobre um rascunho já copiado pela ação e registram eventos para a interface
// mostrar — nenhuma regra daqui exibe nada.
import { calculateStreak } from './streak';
import { addDays, mondayOf, type DateKey } from './dates';
import {
  applyCheckinXP, bonusXP, freeMealThreshold, fullCheckinXP, isBirthday, isNightCheckin, levelInfo,
  STREAK_BONUS_PCT, streakBonusKey, WATER_BONUS_PCT
} from './gamification';
import { waterTargetMl } from './health';
import { computeTotalXP, dayKeyOf, trainingDaysPerWeek, type AppData } from './model';

export type RewardEvent =
  | { kind: 'xp'; amount: number; reason: 'checkin-full' | 'checkin-half' | 'checkin-upgrade' | 'streak' | 'water' }
  | { kind: 'xp-removed'; amount: number }
  | { kind: 'level-up'; level: number }
  | { kind: 'streak-bonus'; streak: number; xp: number }
  | { kind: 'free-meal' }
  | { kind: 'water-goal'; xp: number }
  | { kind: 'birthday'; name: string }
  | { kind: 'record'; name: string; reps: number; weight: number }
  | { kind: 'achievement'; name: string };

/** Dias de treino da semana pelo plano ativo; 6 sem plano (o padrão do app antigo). */
export function daysPerWeekOf(data: AppData): number {
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;
  return (plan && trainingDaysPerWeek(plan)) || 6;
}

export function fullXPOf(data: AppData): number {
  return fullCheckinXP(daysPerWeekOf(data));
}

/** Descanso planejado (dia opcional ou sem exercícios no plano ativo) não quebra a sequência. */
export function streakOf(data: AppData, now: Date): number {
  const plan = data.activePlanId ? data.plans[data.activePlanId] : undefined;
  return calculateStreak({
    isCheckedIn: key => !!data.checkins[key],
    isRestDay: date => {
      const day = plan?.days[dayKeyOf(date)];
      return !!day && (day.optional || day.exercises.length === 0);
    },
    now
  });
}

export function weekCheckins(data: AppData, date: DateKey): number {
  const monday = mondayOf(date);
  let count = 0;
  for (let i = 0; i < 7; i++) if (data.checkins[addDays(monday, i)]) count++;
  return count;
}

/**
 * Recalcula o total depois de um registro de XP ter sido gravado (check-in, bônus) e avisa o
 * ganho. O total nunca é somado à mão: vem sempre dos registros (computeTotalXP).
 */
export function grantXP(draft: AppData, amount: number, events: RewardEvent[], reason: Extract<RewardEvent, { kind: 'xp' }>['reason']): void {
  const before = levelInfo(draft.gamification.totalXP).level;
  draft.gamification.totalXP = computeTotalXP(draft.gamification);
  if (amount <= 0) return;
  events.push({ kind: 'xp', amount, reason });
  const after = levelInfo(draft.gamification.totalXP).level;
  if (after > before) events.push({ kind: 'level-up', level: after });
}

/** Check-in de um dia com XP cheio ou meio, mais os bônus que ele pode destravar. */
export function grantCheckin(draft: AppData, date: DateKey, full: boolean, now: Date, events: RewardEvent[]): void {
  const g = draft.gamification;
  const existing = g.checkinXP[date];
  const { record, gained } = applyCheckinXP(existing, full, fullXPOf(draft));
  g.checkinXP[date] = record;
  grantXP(draft, gained, events, existing ? 'checkin-upgrade' : full ? 'checkin-full' : 'checkin-half');
  if (isNightCheckin(now)) g.nightCheckins[date] = true;

  const streak = streakOf(draft, now);
  if (streak > g.longestStreak) g.longestStreak = streak;
  const key = streakBonusKey(draft.activePlanId ?? 'sem-plano', streak, daysPerWeekOf(draft));
  if (key && g.streakBonuses[key] === undefined) {
    const xp = bonusXP(fullXPOf(draft), STREAK_BONUS_PCT);
    g.streakBonuses[key] = xp;
    grantXP(draft, xp, events, 'streak');
    events.push({ kind: 'streak-bonus', streak, xp });
  }

  const week = mondayOf(date);
  if (!g.freeMealRewards[week] && weekCheckins(draft, date) >= freeMealThreshold(daysPerWeekOf(draft))) {
    g.freeMealRewards[week] = true;
    events.push({ kind: 'free-meal' });
  }
}

/** Desfazer o check-in devolve o XP do dia (bônus já destravados ficam, como no app antigo). */
export function revokeCheckin(draft: AppData, date: DateKey, events: RewardEvent[]): void {
  const record = draft.gamification.checkinXP[date];
  if (!record) return;
  delete draft.gamification.checkinXP[date];
  draft.gamification.totalXP = computeTotalXP(draft.gamification);
  events.push({ kind: 'xp-removed', amount: record.amount });
}

export function checkWaterGoal(draft: AppData, date: DateKey, events: RewardEvent[]): void {
  const target = waterTargetMl(draft.profile.weightKg ?? 0, draft.profile.activityLevel);
  if (target <= 0 || (draft.water[date] ?? 0) < target || draft.gamification.waterBonus[date] !== undefined) return;
  const xp = bonusXP(fullXPOf(draft), WATER_BONUS_PCT);
  draft.gamification.waterBonus[date] = xp;
  grantXP(draft, xp, events, 'water');
  events.push({ kind: 'water-goal', xp });
}

export function checkBirthday(draft: AppData, now: Date, events: RewardEvent[]): void {
  if (!isBirthday(draft.profile.birthdate, now)) return;
  const year = String(now.getFullYear());
  if (draft.gamification.birthdayGreeted[year]) return;
  draft.gamification.birthdayGreeted[year] = true;
  events.push({ kind: 'birthday', name: draft.profile.name });
}
