export const MAX_LEVEL = 100;
/** XP "alvo" por semana, dividido pelos dias de treino do plano. */
export const WEEKLY_XP_POOL = 600;
export const WATER_BONUS_PCT = 0.1;
export const STREAK_BONUS_PCT = 0.3;
/** Fração dos dias planejados na semana que libera a refeição livre. */
export const FREE_MEAL_THRESHOLD_PCT = 0.8;

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  /** XP necessário para o próximo nível; 0 no nível máximo. */
  xpToNext: number;
  totalXP: number;
}

export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 15;
}

export function levelInfo(totalXP: number, maxLevel = MAX_LEVEL): LevelInfo {
  let level = 1;
  let start = 0;
  while (level < maxLevel) {
    const need = xpForLevel(level);
    if (totalXP - start < need) break;
    start += need;
    level++;
  }
  return { level, xpIntoLevel: totalXP - start, xpToNext: level < maxLevel ? xpForLevel(level) : 0, totalXP };
}

export function fullCheckinXP(daysPerWeek: number, weeklyPool = WEEKLY_XP_POOL): number {
  return Math.max(20, Math.round(weeklyPool / (daysPerWeek || 6)));
}

export function halfCheckinXP(fullXP: number): number {
  return Math.round(fullXP / 2);
}

export function bonusXP(fullXP: number, percent: number): number {
  return Math.max(1, Math.round(fullXP * percent));
}

export interface CheckinXPRecord {
  amount: number;
  full: boolean;
}

/**
 * XP de check-in de um dia. Idempotente: repetir não concede em dobro, e passar de "meio" para
 * "cheio" concede só a diferença. Nunca rebaixa um check-in cheio.
 */
export function applyCheckinXP(existing: CheckinXPRecord | undefined, full: boolean, fullXP: number):
  { record: CheckinXPRecord; gained: number } {
  const target = full ? fullXP : halfCheckinXP(fullXP);
  if (!existing) return { record: { amount: target, full }, gained: target };
  if (!existing.full && full) return { record: { amount: fullXP, full: true }, gained: fullXP - existing.amount };
  return { record: existing, gained: 0 };
}

/** Check-in noturno (21h–6h59), usado por uma conquista. */
export function isNightCheckin(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 21 || hour < 7;
}

/**
 * Bônus de sequência: a cada ciclo completo de dias do plano (6 dias seguidos num plano de 6).
 * Devolve a chave do ciclo alcançado, ou null se ainda não completou nenhum.
 */
export function streakBonusKey(planId: string, streak: number, daysPerWeek: number): string | null {
  const cycles = Math.floor(streak / (daysPerWeek || 6));
  return cycles >= 1 ? `${planId}_${cycles}` : null;
}

export function freeMealThreshold(daysPerWeek: number, pct = FREE_MEAL_THRESHOLD_PCT): number {
  return Math.ceil((daysPerWeek || 6) * pct);
}

/** Aniversário hoje? `birthdate` em AAAA-MM-DD; datas inválidas nunca casam. */
export function isBirthday(birthdate: string | undefined, now: Date): boolean {
  if (!birthdate) return false;
  const b = new Date(`${birthdate}T00:00:00`);
  return !Number.isNaN(b.getTime()) && b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
}
